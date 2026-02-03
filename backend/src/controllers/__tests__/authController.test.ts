import { vi, describe, it, expect, beforeEach } from "vitest";
import { register, login, forgotPassword } from "../authController";
import User from "../../models/User";
import Organization from "../../models/Organization";
import PasswordReset from "../../models/PasswordReset";
import {
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidObjectId,
} from "../../utils/validators";
import { sendPasswordResetEmail, generateOTP } from "../../services/emailService";
import { signJwt } from "../../middleware/auth";

// Mocks
vi.mock("../../models/User");
vi.mock("../../models/Organization");
vi.mock("../../models/PasswordReset");
vi.mock("../../utils/validators");
vi.mock("../../services/emailService");
vi.mock("../../middleware/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../middleware/auth")>();
  return {
    ...actual,
    signJwt: vi.fn(() => "mock_token"),
  };
});

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default validator mocks
    (isValidEmail as any).mockReturnValue(true);
    (isValidPassword as any).mockReturnValue({ valid: true });
    (isValidName as any).mockReturnValue({ valid: true });
    (isValidObjectId as any).mockReturnValue(true);
  });

  describe("register", () => {
    it("returns 400 if fields are missing", async () => {
      const { res, status, json } = createMockRes();
      const req = { body: { name: "", email: "", password: "" } } as any;
      const next = vi.fn();

      await register(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Name, email, and password are required" })
      );
    });

    it("registers the first user as superadmin", async () => {
      const { res, status, json } = createMockRes();
      const req = {
        body: {
          name: "First User",
          email: "admin@example.com",
          password: "password123",
        },
      } as any;
      const next = vi.fn();

      (User.findOne as any).mockResolvedValue(null); // No existing user
      (User.countDocuments as any).mockResolvedValue(0); // No users in DB
      
      const saveMock = vi.fn();
      (User as any).mockImplementation((data: any) => ({
        ...data,
        _id: "user-id-1",
        save: saveMock,
      }));

      await register(req, res, next);

      expect(saveMock).toHaveBeenCalled();
      // First user should be superadmin
      expect(User).toHaveBeenCalledWith(
        expect.objectContaining({ role: "superadmin" })
      );
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, token: "mock_token" })
      );
    });

    it("fails if user already exists", async () => {
      const { res, status, json } = createMockRes();
      const req = {
        body: {
          name: "User",
          email: "exist@example.com",
          password: "pw",
        },
      } as any;
      
      (User.findOne as any).mockResolvedValue({ _id: "existing" });

      await register(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "User with this email already exists" })
      );
    });
  });

  describe("login", () => {
    it("returns 401 for invalid credentials", async () => {
      const { res, status, json } = createMockRes();
      const req = { body: { email: "a@b.com", password: "wrong" } } as any;

      const mockUser = {
        matchPassword: vi.fn().mockResolvedValue(false),
        select: vi.fn().mockReturnThis(),
      };
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      await login(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(401);
    });

    it("returns token on success", async () => {
      const { res, json } = createMockRes();
      const req = { body: { email: "a@b.com", password: "right" } } as any;

      const mockUser = {
        _id: "u1",
        name: "User",
        email: "a@b.com",
        role: "user",
        matchPassword: vi.fn().mockResolvedValue(true),
        tenantId: "t1",
      };
      
      // Mock chain: findOne().select() -> resolves to user
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      await login(req, res, vi.fn());

      expect(signJwt).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, token: "mock_token" })
      );
    });
  });

  describe("forgotPassword", () => {
    it("returns secure success message even if user not found", async () => {
      const { res, json } = createMockRes();
      const req = { body: { email: "unknown@example.com" } } as any;

      (User.findOne as any).mockResolvedValue(null);

      await forgotPassword(req, res, vi.fn());

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      // Ensure we didn't try to send email
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("generates OTP and sends email if user exists", async () => {
      const { res, json } = createMockRes();
      const req = { body: { email: "found@example.com" } } as any;

      const mockUser = { _id: "u1", email: "found@example.com" };
      (User.findOne as any).mockResolvedValue(mockUser);
      (generateOTP as any).mockReturnValue("123456");
      (PasswordReset.deleteMany as any).mockResolvedValue({});
      (PasswordReset.create as any).mockResolvedValue({});

      await forgotPassword(req, res, vi.fn());

      expect(PasswordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({ otp: "123456", email: "found@example.com" })
      );
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        "found@example.com",
        "123456"
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});

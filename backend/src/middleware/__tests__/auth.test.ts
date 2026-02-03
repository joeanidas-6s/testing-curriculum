import { vi, describe, it, expect, beforeEach } from "vitest";
import { 
  authenticateToken, 
  authorizeRoles, 
  validateResourceAccess,
  AuthenticatedRequest 
} from "../auth";
import jwt from "jsonwebtoken";

// Mock jsonwebtoken
vi.mock("jsonwebtoken");

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticateToken", () => {
    it("returns 401 if token is missing", () => {
      const { res, status } = createMockRes();
      const req = { headers: {} } as any;
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("evaluates valid token", () => {
      const { res } = createMockRes();
      const req = { headers: { authorization: "Bearer valid-token" } } as any;
      const next = vi.fn();
      
      const decodedPayload = { userId: "u1", email: "test@test.com", role: "user" };
      (jwt.verify as any).mockReturnValue(decodedPayload);

      authenticateToken(req, res, next);

      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalled();
    });

    it("handles invalid token error", () => {
      const { res, status, json } = createMockRes();
      const req = { headers: { authorization: "Bearer bad-token" } } as any;
      
      (jwt.verify as any).mockImplementation(() => {
        throw { name: "JsonWebTokenError" };
      });

      authenticateToken(req, res, vi.fn());

      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid Token" })
      );
    });
  });

  describe("authorizeRoles", () => {
    it("calls next if user has correct role", () => {
      const req = { user: { role: "admin" } } as unknown as AuthenticatedRequest;
      const { res } = createMockRes();
      const next = vi.fn();

      const middleware = authorizeRoles("admin", "superadmin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 403 if user has wrong role", () => {
      const req = { user: { role: "user" } } as unknown as AuthenticatedRequest;
      const { res, status } = createMockRes();
      const next = vi.fn();

      const middleware = authorizeRoles("admin");
      middleware(req, res, next);

      expect(status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("validateResourceAccess", () => {
    it("allows superadmin to access anything", () => {
      const req = { user: { role: "superadmin" } } as any;
      expect(validateResourceAccess(req, "other-user", "other-tenant")).toBe(true);
    });

    it("allows user to access their own resource", () => {
      const req = { user: { role: "user", userId: "u1" } } as any;
      expect(validateResourceAccess(req, "u1", "t1")).toBe(true);
    });

    it("blocks user from accessing other user's resource", () => {
      const req = { user: { role: "user", userId: "u1" } } as any;
      expect(validateResourceAccess(req, "u2", "t1")).toBe(false);
    });
  });
});

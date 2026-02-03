import { vi } from "vitest";
import nodemailer from "nodemailer";
import {
  sendEmail,
  generateOTP,
  sendPasswordResetEmail,
} from "../emailService";

vi.mock("nodemailer", () => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "mock-id" });
  return {
    __esModule: true,
    default: {
      createTransport: vi.fn(() => ({
        sendMail,
      })),
    },
  };
});

describe("emailService", () => {
  it("generateOTP returns 6-digit string", () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it("sendEmail delegates to nodemailer transport", async () => {
    const transportInstance = (nodemailer as any).createTransport() as {
      sendMail: ReturnType<typeof vi.fn>;
    };

    await sendEmail({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });

    expect(transportInstance.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Hello",
      }),
    );
  });

  it("sendPasswordResetEmail builds expected email", async () => {
    const transportInstance = (nodemailer as any).createTransport() as {
      sendMail: ReturnType<typeof vi.fn>;
    };
    transportInstance.sendMail.mockClear();

    const otp = "123456";
    await sendPasswordResetEmail("user@example.com", otp);

    expect(transportInstance.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Password Reset OTP - TaskFlow",
      }),
    );
    const args = transportInstance.sendMail.mock.calls[0][0];
    expect(args.html).toContain(otp);
  });
});


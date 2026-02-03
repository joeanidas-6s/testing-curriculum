import nodemailer from "nodemailer";
import {
  sendEmail,
  generateOTP,
  sendPasswordResetEmail,
} from "../emailService";

jest.mock("nodemailer", () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: "mock-id" });
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn(() => ({
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
      sendMail: jest.Mock;
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
      sendMail: jest.Mock;
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


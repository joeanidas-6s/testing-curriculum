import {
  isValidEmail,
  isValidPassword,
  isValidTaskTitle,
  isValidTaskStatus,
  isValidObjectId,
  isValidName,
  sanitizeInput,
} from "../validators";

describe("validators", () => {
  it("validates email correctly", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });

  it("validates password length", () => {
    expect(isValidPassword("12345")).toEqual({
      valid: false,
      message: "Password must be at least 6 characters",
    });
    expect(isValidPassword("123456")).toEqual({ valid: true });
  });

  it("validates task title", () => {
    expect(isValidTaskTitle("")).toEqual({
      valid: false,
      message: "Title is required and must be a string",
    });
    expect(isValidTaskTitle("   ")).toEqual({
      valid: false,
      message: "Title cannot be empty",
    });
    expect(isValidTaskTitle("OK")).toEqual({ valid: true });
  });

  it("validates task status", () => {
    expect(isValidTaskStatus("todo")).toEqual({ valid: true });
    expect(isValidTaskStatus("unknown").valid).toBe(false);
  });

  it("validates object id format", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidObjectId("not-an-id")).toBe(false);
  });

  it("validates name", () => {
    expect(isValidName("A").valid).toBe(false);
    expect(isValidName("John Doe")).toEqual({ valid: true });
  });

  it("sanitizes input", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
    // non-string → empty
    expect(sanitizeInput(123 as unknown as string)).toBe("");
  });
});


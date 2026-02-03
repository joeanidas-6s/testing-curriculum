import { vi } from "vitest";
import { ApiError, successResponse, errorResponse } from "../errorUtils";

function createMockRes() {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnThis(),
    json,
  } as any;
  return { res, json };
}

describe("ApiError", () => {
  it("sets name, message and status", () => {
    const err = new ApiError("Oops", 404);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("Oops");
    expect(err.status).toBe(404);
  });
});

describe("successResponse", () => {
  it("wraps data with success flag and message", () => {
    const { res, json } = createMockRes();

    successResponse(res, { data: { id: 1 } }, "Created", 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Created",
      data: { id: 1 },
    });
  });
});

describe("errorResponse", () => {
  it("handles generic errors as 500", () => {
    const { res, json } = createMockRes();
    const err = new Error("Boom");

    errorResponse(res, err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Internal Server Error",
    });
  });

  it("uses ApiError message and status", () => {
    const { res, json } = createMockRes();
    const err = new ApiError("Not found", 404);

    errorResponse(res, err);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Not found",
    });
  });
});


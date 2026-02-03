import { vi } from "vitest";
import { authService } from "../authService";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS, STORAGE_KEYS } from "@/config/api";

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("login calls API with skipAuth and stores token", async () => {
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({
      message: "ok",
      token: "token-1",
      user: { id: "u1", name: "Jane", email: "jane@example.com" },
    });

    const result = await authService.login({
      email: "jane@example.com",
      password: "pw",
    });

    expect(post).toHaveBeenCalledWith(
      API_ENDPOINTS.AUTH.LOGIN,
      { email: "jane@example.com", password: "pw" },
      { skipAuth: true },
    );
    expect(result.token).toBe("token-1");
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe("token-1");
  });

  it("logout removes token", () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, "token-1");
    authService.logout();
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
  });
});


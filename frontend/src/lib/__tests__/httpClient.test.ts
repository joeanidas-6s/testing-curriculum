import { jest } from "@jest/globals";
import { httpClient } from "../httpClient";
import { useAuthStore } from "@/store/authStore";
import { UnauthorizedError } from "@/types/errors";

function jsonFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("httpClient", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("adds Authorization header when not skipAuth", async () => {
    useAuthStore.setState({ isAuthenticated: true, token: "t-123" });

    const fetchMock = jest
      .spyOn(globalThis as unknown as { fetch: typeof globalThis.fetch }, "fetch")
      .mockResolvedValue(
        jsonFetchResponse(200, { ok: true }),
      );

    await httpClient.get("/api/ping");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer t-123");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not require auth when skipAuth is true", async () => {
    const fetchMock = jest
      .spyOn(globalThis as unknown as { fetch: typeof globalThis.fetch }, "fetch")
      .mockResolvedValue(
        jsonFetchResponse(200, { ok: true }),
      );

    await httpClient.get("/api/public", { skipAuth: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedError when no token and auth is required", async () => {
    await expect(httpClient.get("/api/ping")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});


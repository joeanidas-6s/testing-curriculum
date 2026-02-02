import { jest } from "@jest/globals";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "../ProtectedRoute";

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <div>Secret</div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    // reset store to logged-out
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    jest.restoreAllMocks();
  });

  it("redirects to /login when no token", async () => {
    renderWithProviders(<AppRoutes />, { route: "/protected" });
    // Loader briefly, then redirect
    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when authenticated and token is valid", async () => {
    useAuthStore.setState({ isAuthenticated: true, token: "token-123" });

    const fetchMock = jest
      .spyOn(globalThis as unknown as { fetch: typeof globalThis.fetch }, "fetch")
      .mockResolvedValue(
        jsonFetchResponse(200, { user: { id: "u1" } }),
      );

    renderWithProviders(<AppRoutes />, { route: "/protected" });

    expect(await screen.findByText("Secret")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("redirects to /login when token validation fails", async () => {
    useAuthStore.setState({ isAuthenticated: true, token: "bad-token" });

    jest
      .spyOn(globalThis as unknown as { fetch: typeof globalThis.fetch }, "fetch")
      .mockResolvedValue(
        jsonFetchResponse(401, { error: "Unauthorized" }),
      );

    renderWithProviders(<AppRoutes />, { route: "/protected" });

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });
});


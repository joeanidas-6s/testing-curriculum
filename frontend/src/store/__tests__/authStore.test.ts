import { useAuthStore } from "../authStore";
import { STORAGE_KEYS } from "@/config/api";

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("login stores token and marks authenticated", () => {
    useAuthStore
      .getState()
      .login("t-123", { id: "u1", name: "Jane", email: "jane@example.com" });

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe("t-123");
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe("t-123");
    expect(state.user?.id).toBe("u1");
  });

  it("logout clears token and user", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: "t-123",
      user: { id: "u1", name: "Jane", email: "jane@example.com" },
    });
    localStorage.setItem(STORAGE_KEYS.TOKEN, "t-123");

    useAuthStore.getState().logout();

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});


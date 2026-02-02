import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../Navbar";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { useAuthStore } from "@/store/authStore";
import { Route, Routes, useLocation } from "react-router-dom";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <LocationDisplay />
          </>
        }
      />
      <Route path="/login" element={<div>Login Page</div>} />
    </Routes>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("shows Login and Register when logged out", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /register/i }),
    ).toBeInTheDocument();
  });

  it("navigates to /login when Login is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/" });
    expect(screen.getByTestId("location")).toHaveTextContent("/");
    await user.click(screen.getByRole("button", { name: /login/i }));
    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });
});


import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

function Boom(): never {
  throw new Error("Boom");
}

describe("ErrorBoundary", () => {
  it("renders fallback UI when a child throws", () => {
    // silence React error boundary logs in test output
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText(/oops! something went wrong/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});


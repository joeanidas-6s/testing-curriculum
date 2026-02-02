import { render, screen } from "@testing-library/react";
import { Loader } from "../Loader";

describe("Loader", () => {
  it("renders Loading... text", () => {
    render(<Loader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("uses full screen container by default", () => {
    const { container } = render(<Loader />);
    expect(container.firstChild).toHaveClass("min-h-screen");
  });

  it("can render non-fullscreen layout", () => {
    const { container } = render(<Loader fullScreen={false} />);
    expect(container.firstChild).toHaveClass("p-8");
  });
});


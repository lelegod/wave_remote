import { render, screen } from "@testing-library/react";

function Hello() {
  return <p>hello react</p>;
}

test("react renders into jsdom", () => {
  render(<Hello />);
  expect(screen.getByText("hello react")).toBeInTheDocument();
});

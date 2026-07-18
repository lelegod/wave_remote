import { render } from "@testing-library/react";
import { WaveMark, StopIcon } from "../../src/shared/components/icons";

test("WaveMark renders an svg sized by the size prop", () => {
  const { container } = render(<WaveMark size={20} />);
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg?.getAttribute("width")).toBe("20");
});

test("StopIcon renders an svg", () => {
  const { container } = render(<StopIcon />);
  expect(container.querySelector("svg")).not.toBeNull();
});

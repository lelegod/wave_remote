import { render } from "@testing-library/react";
import { useRef } from "react";
import { Meter, type MeterController } from "../../src/features/clap-control/Meter";

test("Meter mounts a canvas and registers a controller", () => {
  let ctrl: React.MutableRefObject<MeterController | null> = { current: null };
  function Host() {
    const ref = useRef<MeterController | null>(null);
    ctrl = ref;
    return <Meter controller={ref} />;
  }
  const { container } = render(<Host />);
  expect(container.querySelector("canvas")).not.toBeNull();
  expect(ctrl.current).not.toBeNull();
  expect(() => ctrl.current?.push(200)).not.toThrow();
});

test("Meter nulls the controller on unmount", () => {
  let ctrl: React.MutableRefObject<MeterController | null> = { current: null };
  function Host() {
    const ref = useRef<MeterController | null>(null);
    ctrl = ref;
    return <Meter controller={ref} />;
  }
  const { unmount } = render(<Host />);
  expect(ctrl.current).not.toBeNull();
  unmount();
  expect(ctrl.current).toBeNull();
});

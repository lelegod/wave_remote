import { render, screen, waitFor } from "@testing-library/react";
import { installChromeMock } from "../support/chrome-mock";
import { App } from "../../src/options";

function stubMediaStubs() {
  (navigator as unknown as { permissions: unknown }).permissions = {
    query: vi.fn().mockResolvedValue({
      state: "prompt",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      enumerateDevices: vi.fn().mockResolvedValue([])
    },
    configurable: true
  });
}

test("renders the mic permission section", async () => {
  installChromeMock();
  stubMediaStubs();
  render(<App />);
  await waitFor(() => expect(screen.getByText("Microphone Permission")).toBeInTheDocument());
});

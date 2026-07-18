import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { installChromeMock } from "../support/chrome-mock";
import { App } from "../../src/options";

function setup() {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("renders the mic permission section", async () => {
  setup();
  render(<App />);
  await waitFor(() => expect(screen.getByText("Microphone Permission")).toBeInTheDocument());
});

test("shows the intent question and records a pick", async () => {
  setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  expect(screen.getByText(/what will you use wave remote for/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /cooking/i }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).usecase).toBe("Cooking");
  await waitFor(() => expect(screen.getByTestId("intent-thanks")).toBeInTheDocument());
});

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

test("choosing Other reveals a text box and submits the typed use case", async () => {
  setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /^other$/i }));

  const input = screen.getByTestId("intent-other-input");
  const submit = screen.getByTestId("intent-other-submit");
  // Submit is disabled until something is typed.
  expect(submit).toBeDisabled();

  fireEvent.change(input, { target: { value: "  Gaming  " } });
  fireEvent.click(submit);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).usecase).toBe("Gaming");
  await waitFor(() => expect(screen.getByTestId("intent-thanks")).toBeInTheDocument());
});

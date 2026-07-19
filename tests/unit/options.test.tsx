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

test("granting mic permission records a mic_permission event and intents carry install_id", async () => {
  setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  (globalThis as unknown as { chrome: { storage: { local: { get: ReturnType<typeof vi.fn> } } } })
    .chrome.storage.local.get.mockResolvedValue({ installId: "id-xyz" });
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /cooking/i }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const intentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(intentBody.install_id).toBe("id-xyz");
});

test("granting mic permission emits a mic_permission granted event", async () => {
  setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  const chromeMock = (globalThis as unknown as { chrome: { runtime: { sendMessage: ReturnType<typeof vi.fn> } } }).chrome;
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /grant microphone access/i }));
  await waitFor(() =>
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRACK_EVENT", name: "mic_permission", props: { result: "granted" } })
    )
  );
});

test("denying mic permission emits a mic_permission denied event", async () => {
  setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  const chromeMock = (globalThis as unknown as { chrome: { runtime: { sendMessage: ReturnType<typeof vi.fn> } } }).chrome;
  (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("denied"));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /grant microphone access/i }));
  await waitFor(() =>
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRACK_EVENT", name: "mic_permission", props: { result: "denied" } })
    )
  );
});

test("options page shows the anonymous-usage disclosure with a privacy link", async () => {
  setup();
  render(<App />);
  const link = screen.getByTestId("privacy-link");
  expect(link).toHaveAttribute("href", expect.stringContaining("gist.github.com"));
  expect(screen.getByText(/anonymous usage/i)).toBeInTheDocument();
});

import { installChromeMock } from "../support/chrome-mock";
import { getInstallId, track, recordEvent } from "../../src/features/telemetry/track";

test("getInstallId creates and persists a uuid on first call", async () => {
  const chrome = installChromeMock();
  chrome.storage.local.get.mockResolvedValue({});
  const id = await getInstallId();
  expect(typeof id).toBe("string");
  expect(id.length).toBeGreaterThan(0);
  expect(chrome.storage.local.set).toHaveBeenCalledWith({ installId: id });
});

test("getInstallId returns the existing uuid without rewriting", async () => {
  const chrome = installChromeMock();
  chrome.storage.local.get.mockResolvedValue({ installId: "existing-uuid" });
  const id = await getInstallId();
  expect(id).toBe("existing-uuid");
  expect(chrome.storage.local.set).not.toHaveBeenCalled();
});

test("track sends a TRACK_EVENT runtime message with name and props", () => {
  const chrome = installChromeMock();
  track("command_executed", { command: "playpause", site: "youtube" });
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
    type: "TRACK_EVENT",
    name: "command_executed",
    props: { command: "playpause", site: "youtube" }
  });
});

test("recordEvent inserts an events row with id, name, version, os", async () => {
  const chrome = installChromeMock();
  chrome.storage.local.get.mockResolvedValue({ installId: "id-123" });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  const savedPlatform = Object.getOwnPropertyDescriptor(navigator, "platform");
  Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
  try {
    const ok = await recordEvent("listening_started");
    expect(ok).toBe(true);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/rest\/v1\/events$/);
    const body = JSON.parse(opts.body);
    expect(body.install_id).toBe("id-123");
    expect(body.name).toBe("listening_started");
    expect(body.version).toBe("1.0.0");
    expect(body.os).toBe("macOS");
    expect(body.props).toBe(null);
  } finally {
    if (savedPlatform) Object.defineProperty(navigator, "platform", savedPlatform);
    else Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "platform");
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

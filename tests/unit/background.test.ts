import { installChromeMock } from "../support/chrome-mock";

async function loadBackground() {
  vi.resetModules();
  const chrome = installChromeMock();
  chrome.storage.local.get.mockResolvedValue({ installId: "id-123" });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  await import("../../src/background");
  const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
  return { chrome, fetchMock, listener };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("TRACK_EVENT relays to an events insert and keeps the worker alive", async () => {
  const { fetchMock, listener } = await loadBackground();
  const sendResponse = vi.fn();
  const kept = listener({ type: "TRACK_EVENT", name: "command_executed", props: { command: "playpause", site: "youtube" } }, {}, sendResponse);
  expect(kept).toBe(true); // returns true so MV3 does not suspend before the insert resolves
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.name).toBe("command_executed");
});

test("OFFSCREEN_READY records listening_started", async () => {
  const { fetchMock, listener } = await loadBackground();
  listener({ type: "OFFSCREEN_READY", status: "listening" }, {}, vi.fn());
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.name).toBe("listening_started");
});

test("STOP_LISTENING records listening_stopped with a numeric durationMs", async () => {
  const { chrome, fetchMock, listener } = await loadBackground();
  chrome.storage.local.get.mockImplementation((keys) => {
    const k = Array.isArray(keys) ? keys : [keys];
    if (k.includes("listeningStartedAt")) return Promise.resolve({ listeningStartedAt: 1000 });
    return Promise.resolve({ installId: "id-123" });
  });
  listener({ type: "STOP_LISTENING" }, {}, vi.fn());
  await vi.waitFor(() => {
    const call = fetchMock.mock.calls.find((c) => JSON.parse(c[1].body).name === "listening_stopped");
    expect(call).toBeTruthy();
  });
  const call = fetchMock.mock.calls.find((c) => JSON.parse(c[1].body).name === "listening_stopped");
  const body = JSON.parse(call![1].body);
  expect(typeof body.props.durationMs).toBe("number");
});

test("STOP_LISTENING does not record listening_stopped when no start time is stored", async () => {
  const { chrome, fetchMock, listener } = await loadBackground();
  chrome.storage.local.get.mockResolvedValue({ installId: "id-123" });
  listener({ type: "STOP_LISTENING" }, {}, vi.fn());
  await new Promise((r) => setTimeout(r, 20));
  const stopped = fetchMock.mock.calls.find((c) => JSON.parse(c[1].body).name === "listening_stopped");
  expect(stopped).toBeUndefined();
});

test("OFFSCREEN_ERROR records an error event with where=mic_init", async () => {
  const { fetchMock, listener } = await loadBackground();
  listener({ type: "OFFSCREEN_ERROR", error: "boom" }, {}, vi.fn());
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.name).toBe("error");
  expect(body.props.where).toBe("mic_init");
});

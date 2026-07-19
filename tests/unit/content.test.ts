import { installChromeMock } from "../support/chrome-mock";

async function loadContent() {
  vi.resetModules();
  const chrome = installChromeMock();
  await import("../../src/content");
  const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
  return { chrome, listener };
}

afterEach(() => { vi.resetModules(); document.body.innerHTML = ""; });

test("TOGGLE_PLAY on a page with a video emits command_executed", async () => {
  const { chrome, listener } = await loadContent();
  document.body.innerHTML = "<video></video>";
  listener({ type: "TOGGLE_PLAY" }, {}, vi.fn());
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({ type: "TRACK_EVENT", name: "command_executed" })
  );
  const call = chrome.runtime.sendMessage.mock.calls.find((c) => c[0].name === "command_executed");
  expect(call?.[0].props.command).toBe("playpause");
});

test("TOGGLE_PLAY with no video emits error:no_video", async () => {
  const { chrome, listener } = await loadContent();
  listener({ type: "TOGGLE_PLAY" }, {}, vi.fn());
  const call = chrome.runtime.sendMessage.mock.calls.find((c) => c[0].name === "error");
  expect(call?.[0].props.where).toBe("no_video");
});

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { installChromeMock } from "../support/chrome-mock";
import { App } from "../../src/popup";

test("shows Start Listening when not listening and setup is complete", async () => {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
  chrome.storage.local.get.mockResolvedValue({ selectedMicId: "mic1", hasPermission: true });
  chrome.runtime.sendMessage.mockResolvedValue({ isListening: false });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("toggle")).toHaveTextContent(/start listening/i));
});

test("shows Error status when a background message fails", async () => {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
  chrome.storage.local.get.mockResolvedValue({ selectedMicId: "mic1", hasPermission: true });
  chrome.runtime.sendMessage.mockRejectedValue(new Error("no receiver"));
  render(<App />);
  await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());
});

test("clicking Start sends START_OFFSCREEN then START_LISTENING", async () => {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
  chrome.storage.local.get.mockResolvedValue({ selectedMicId: "mic1", hasPermission: true });
  chrome.runtime.sendMessage.mockResolvedValue({ isListening: false });
  render(<App />);
  const btn = await screen.findByTestId("toggle");
  fireEvent.click(btn);
  await waitFor(() => {
    const types = chrome.runtime.sendMessage.mock.calls.map((c) => c[0].type);
    expect(types).toContain("START_OFFSCREEN");
    expect(types).toContain("START_LISTENING");
  });
});

test("popup shows the floating feedback button", async () => {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
  chrome.storage.local.get.mockResolvedValue({ selectedMicId: "mic1", hasPermission: true });
  chrome.runtime.sendMessage.mockResolvedValue({ isListening: false });
  render(<App />);
  expect(await screen.findByTestId("fb-open")).toBeInTheDocument();
});

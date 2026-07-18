import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { installChromeMock } from "../support/chrome-mock";
import { FeedbackWidget } from "../../src/features/feedback/FeedbackWidget";

function setup() {
  const chrome = installChromeMock();
  (chrome.runtime as unknown as { getManifest: () => { version: string } }).getManifest = () => ({ version: "1.0.0" });
}
afterEach(() => vi.restoreAllMocks());

test("the floating button opens a panel with message + email fields", () => {
  setup();
  render(<FeedbackWidget />);
  fireEvent.click(screen.getByTestId("fb-open"));
  expect(screen.getByTestId("fb-message")).toBeInTheDocument();
  expect(screen.getByTestId("fb-email")).toBeInTheDocument();
});

test("submits sentiment + optional email, then shows the thanks state", async () => {
  setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  render(<FeedbackWidget />);
  fireEvent.click(screen.getByTestId("fb-open"));
  fireEvent.click(screen.getByTestId("fb-up"));
  fireEvent.change(screen.getByTestId("fb-email"), { target: { value: "user@example.com" } });
  fireEvent.click(screen.getByTestId("fb-send"));
  await waitFor(() => expect(screen.getByTestId("fb-thanks")).toBeInTheDocument());
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.sentiment).toBe("up");
  expect(body.email).toBe("user@example.com");
});

test("blocks send and shows an error for a malformed email", async () => {
  setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  render(<FeedbackWidget />);
  fireEvent.click(screen.getByTestId("fb-open"));
  fireEvent.change(screen.getByTestId("fb-email"), { target: { value: "notanemail" } });
  fireEvent.click(screen.getByTestId("fb-send"));
  expect(screen.getByTestId("fb-email-error")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("shows an error and no thanks when the send fails", async () => {
  setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<FeedbackWidget />);
  fireEvent.click(screen.getByTestId("fb-open"));
  fireEvent.click(screen.getByTestId("fb-send"));
  await waitFor(() => expect(screen.getByTestId("fb-error")).toBeInTheDocument());
});

// Minimal chrome.* stub for component tests. Extend per-test as needed.
export interface ChromeMock {
  runtime: {
    sendMessage: ReturnType<typeof vi.fn>;
    onMessage: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> };
    openOptionsPage: ReturnType<typeof vi.fn>;
  };
  storage: { local: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } };
}

export function installChromeMock(overrides: Record<string, unknown> = {}): ChromeMock {
  const mock: ChromeMock = {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      openOptionsPage: vi.fn()
    },
    storage: {
      local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) }
    }
  };
  Object.assign(mock, overrides);
  (globalThis as unknown as { chrome: ChromeMock }).chrome = mock;
  return mock;
}

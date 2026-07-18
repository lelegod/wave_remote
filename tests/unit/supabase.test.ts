import { insert } from "../../src/shared/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../src/shared/config";
import { vi, afterEach } from "vitest";

afterEach(() => vi.restoreAllMocks());

test("insert POSTs the row to the table endpoint with anon headers", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  const ok = await insert("intents", { usecase: "Cooking" });
  expect(ok).toBe(true);
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe(`${SUPABASE_URL}/rest/v1/intents`);
  expect(opts.method).toBe("POST");
  expect(opts.headers.apikey).toBe(SUPABASE_ANON_KEY);
  expect(opts.headers.Authorization).toBe(`Bearer ${SUPABASE_ANON_KEY}`);
  expect(JSON.parse(opts.body)).toEqual({ usecase: "Cooking" });
});

test("insert returns false and does not throw on network error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  await expect(insert("feedback", { message: "hi" })).resolves.toBe(false);
});

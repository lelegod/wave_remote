import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Fire-and-forget insert to a Supabase table via PostgREST. Anon key is insert-only per RLS.
export async function insert(table: string, row: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
    return res.ok;
  } catch {
    return false;
  }
}

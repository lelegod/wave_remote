// Supabase values come from .env, injected at build time by esbuild define (see build.mjs).
// The anon key is public by design and safe to ship. Insert-only RLS is what protects the data.
// The fallbacks let the build and tests run before .env is filled.

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://REPLACE_PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "REPLACE_ANON_KEY";

// Hosted privacy policy. The release workflow updates this gist from docs/privacy-policy.md.
export const PRIVACY_POLICY_URL = "https://gist.github.com/lelegod/1bc682f12a899766c153a921c0df9674";

// Pragmatic email check: non-empty, one @, a dot in the domain, no spaces.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function mapOs(platform: string): "Windows" | "macOS" | "ChromeOS" | "Linux" | "Other" {
  const p = platform.toLowerCase();
  if (p.includes("cros")) return "ChromeOS";
  if (p.includes("win")) return "Windows";
  if (p.includes("mac")) return "macOS";
  if (p.includes("linux")) return "Linux";
  return "Other";
}

export function coarseOs(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return mapOs(nav.userAgentData?.platform || navigator.platform || "");
}

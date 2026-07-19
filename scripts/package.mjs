// Zips dist/ into wave-remote-<version>.zip for Chrome Web Store upload.
// Run after a production build. The manifest must sit at the archive root,
// so we zip from inside dist/.
import { readFile, rm, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const version = manifest.version;
const zipName = `wave-remote-${version}.zip`;

try {
  await access("dist/manifest.json");
} catch {
  console.error("[package] dist/manifest.json not found. Run `npm run build` first.");
  process.exit(1);
}

await rm(zipName, { force: true });

// -r recurse, -X strip extra file attributes for a reproducible archive.
await run("zip", ["-r", "-X", `../${zipName}`, "."], { cwd: "dist" });

console.log(`[package] wrote ${zipName}`);

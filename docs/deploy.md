# Deploying Wave Remote

Continuous integration runs on every push/PR. The release is triggered manually
from the GitHub Actions UI. Both run on GitHub Actions (Node 22).

- CI: `.github/workflows/ci.yml` (typecheck, unit tests, build, e2e via `xvfb-run`).
- Release: `.github/workflows/release.yml` (`workflow_dispatch`: production build,
  zip, upload+publish).

## One-time setup

### 1. Supabase (production)

Create a Supabase project and note its **Project URL** and **anon key** (Settings →
API). The anon key is public by design; data is guarded by insert-only row-level
security. Apply the migrations in `supabase/migrations/` in timestamp order by
pasting each into the project's SQL editor. Each schema change is a new
timestamped file in that folder, so the history is tracked in git. The `init`
migration creates the `events` table and `install_id` columns for telemetry.

For local development, create a **separate dev project** and put its creds in a
local `.env` (copy `.env.example`). Test builds then write into the dev database,
never production. The release workflow always injects the prod creds.

### Data disclosure (required before publishing)

Wave Remote sends anonymous usage telemetry (see `docs/privacy-policy.md`). Before
publishing you must:

1. Set the `PRIVACY_POLICY_URL` (in `src/shared/config.ts`) as the privacy policy URL
   in the Web Store Developer Dashboard. It points at a gist that the release workflow
   keeps in sync (see below).
2. Complete the dashboard Privacy tab data-use disclosures to match what the code
   sends: a random install id, event names, extension version, coarse OS, and the use-case answer chosen or typed on the settings page. No audio, no page content, and no PII beyond the optional feedback email and any text a user chooses to type into the use-case box.
3. Certify Limited Use: data is used only to improve the product, never sold.

The release workflow syncs the hosted privacy policy gist from `docs/privacy-policy.md`
on every publish (`publish` checked), so the public policy always matches what ships.
This needs a `GIST_TOKEN` repo secret: a GitHub personal access token with `gist`
scope (the default `GITHUB_TOKEN` cannot edit gists). The gist id is set in
`release.yml`. `docs/privacy-policy.md` is the source of truth; edit it, never the gist
directly.

### 2. Chrome Web Store API credentials

The release workflow uploads through the Chrome Web Store API, which needs an OAuth
client and a refresh token.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or pick)
   a project and enable the **Chrome Web Store API**.
2. Configure the OAuth consent screen, then create an **OAuth client ID** of type
   *Desktop app*. Save the **Client ID** and **Client secret**.
3. Generate a **refresh token** for that client with the
   `https://www.googleapis.com/auth/chromewebstore` scope. The
   [`chrome-webstore-upload-keys`](https://github.com/fregante/chrome-webstore-upload-keys)
   helper walks through the OAuth flow and prints the refresh token.
4. Note your published extension's **ID** (the long string in its Web Store URL).

### 3. GitHub repo secrets

In the repo: Settings → Secrets and variables → Actions → New repository secret.
Add:

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | Prod Supabase project URL |
| `SUPABASE_ANON_KEY` | Prod Supabase anon key |
| `CWS_CLIENT_ID` | OAuth client ID |
| `CWS_CLIENT_SECRET` | OAuth client secret |
| `CWS_REFRESH_TOKEN` | OAuth refresh token |
| `CWS_EXTENSION_ID` | Published extension ID |

No secret values ever live in the repo. The workflows read them via
`${{ secrets.* }}`.

## Cutting a release

1. Bump the version in `manifest.json` (the store reads the version from there).
   The Web Store rejects a re-upload of an already-published version.
2. Commit and push to `main`.
3. In GitHub: Actions → **Release** → **Run workflow**. Choose the branch and the
   `publish` toggle (see the dry run below).

The workflow builds with the prod creds, zips `dist/` into
`wave-remote-<version>.zip` (manifest at the archive root), and uploads to the
Chrome Web Store.

### First release: dry run first

On the first real publish, run the workflow with **publish unchecked**. That uploads
the zip as a **draft** in the CWS dashboard without publishing, so you can confirm
the credentials and build are correct. Once a dry run succeeds, run it again with
**publish checked**.

Check the release build log: the Plan 3 warning
(`SUPABASE_URL / SUPABASE_ANON_KEY are not set`) must **not** appear. If it does,
the prod secrets are not reaching the build step.

## Dev vs prod summary

- **Prod:** built and published only by the manually-triggered release workflow,
  using the `SUPABASE_*` repo secrets.
- **Dev:** local `npm run build` using dev creds from a local `.env`. Loaded unpacked
  from `dist/` at `chrome://extensions`. No CI involvement.

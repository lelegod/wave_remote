import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";

const distPath = path.resolve("dist");

async function launch(): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`]
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const extensionId = new URL(sw.url()).host;
  return { context, extensionId };
}

// The extension opens options.html on install (onboarding). Wait for that tab to
// settle before navigating, otherwise its navigation races the test's goto. Poll
// context.pages() rather than waiting on the page event, so we can't miss it.
async function waitForOnboarding(context: BrowserContext, extensionId: string): Promise<Page> {
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  let optionsPage: Page | undefined;
  await expect
    .poll(() => {
      optionsPage = context.pages().find((p) => p.url().startsWith(optionsUrl));
      return Boolean(optionsPage);
    }, { timeout: 10000 })
    .toBe(true);
  await optionsPage!.waitForLoadState("domcontentloaded");
  return optionsPage!;
}

test("extension loads and popup renders the toggle button", async () => {
  const { context, extensionId } = await launch();
  await waitForOnboarding(context, extensionId);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const toggle = page.locator('[data-testid="toggle"]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText(/Start Listening|Stop Listening/);

  await context.close();
});

test("options page shows the intent question", async () => {
  const { context, extensionId } = await launch();

  // The onboarding tab the extension opens on install is the options page itself.
  const page = await waitForOnboarding(context, extensionId);
  await expect(page.getByText(/what will you use wave remote for/i)).toBeVisible();

  await context.close();
});

import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";

const distPath = path.resolve("dist");

test("extension loads and popup renders the toggle button", async () => {
  const context: BrowserContext = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`]
  });

  // Find the service worker to read the extension id.
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const extensionId = new URL(sw.url()).host;

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const toggle = page.locator('[data-testid="toggle"]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText(/Start Listening|Stop Listening/);

  await context.close();
});

import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

/** Pointron-only settings: footer app version. Open/close/navigate and Mode of interaction are in shared/settings. */
test.describe("pointron – settings (product-specific) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openSettings(page: import("@playwright/test").Page) {
    // Pointron: Settings icon button in top-right nav
    const settingsIconBtn = page.getByRole("button", { name: /^Settings$/i }).first();
    const iconVisible = await settingsIconBtn.isVisible().catch(() => false);
    if (iconVisible) {
      await settingsIconBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(500);
      return;
    }
    await runCommand(page, "Settings");
    await page.waitForTimeout(500);
  }

  test("Settings footer shows app version (Pointron)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    await expect(page.getByText(/Pointron\s+v?[\d.]+/i).first()).toBeVisible({
      timeout: 5_000
    });
  });
});

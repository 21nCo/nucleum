import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";

/** Nucleum-only settings: footer app version. Open/close/navigate and Mode of interaction are in shared/settings. */
test.describe("nucleum – settings (product-specific) @settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openSettings(page: import("@playwright/test").Page) {
    const profileBtn = page.getByTestId("topnav-account-settings");
    const visible = await profileBtn.isVisible().catch(() => false);
    if (visible) {
      await profileBtn.click({ timeout: 5_000 });
    } else {
      await runCommand(page, "Settings");
    }
  }

  test("Settings footer shows app version (Nucleum)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await expect(page.getByText(/Nucleum\s+v?[\d.]+/i).first()).toBeVisible({
      timeout: 5_000
    });
  });
});

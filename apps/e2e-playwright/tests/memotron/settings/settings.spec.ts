import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";

/** Memotron-only settings: footer app version, Relations panel. Open/close/navigate and Mode of interaction are in shared/settings. */
test.describe("memotron - settings (product-specific) @settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openSettings(page: import("@playwright/test").Page) {
    // Memotron: Settings icon button in top-right nav
    const settingsIconBtn = page
      .getByRole("button", { name: /^Settings$/i })
      .first();
    const iconVisible = await settingsIconBtn.isVisible().catch(() => false);
    if (iconVisible) {
      await settingsIconBtn.click({ timeout: 5_000 });
      return;
    }
    await runCommand(page, "Settings");
  }

  test("Settings footer shows app version (Memotron)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await expect(page.getByText(/Memotron\s+v?[\d.]+/i).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("navigate to Relations and assert panel visible (Memotron-only)", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /Relations/i })
      .click({ timeout: 5_000 });

    await expect(page.getByText(/Relations/i).last()).toBeVisible({
      timeout: 5_000
    });
  });
});

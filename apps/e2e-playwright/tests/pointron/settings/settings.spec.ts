import { test, expect } from "@playwright/test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { openRootSettingsFromCommand as openSettings } from "../../utils/settings";

/** Pointron-only settings: footer app version. Open/close/navigate and Mode of interaction are in shared/settings. */
test.describe("pointron - settings (product-specific) @settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("Settings footer shows app version (Pointron)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await expect(page.getByText(/Pointron\s+v?[\d.]+/i).first()).toBeVisible({
      timeout: 5_000
    });
  });
});

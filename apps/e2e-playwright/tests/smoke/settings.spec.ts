import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../utils/helpers";
import { assertSettingsShellVisible, openSettings } from "../utils/settings";

test.describe("settings smoke @settings @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });
  });

  test("settings opens from the app shell", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openSettings(page);
    await assertSettingsShellVisible(page);
  });
});

import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../utils/helpers";
import { assertSettingsShellVisible, openSettings } from "../utils/settings";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

test.describe("settings smoke @smoke", () => {
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

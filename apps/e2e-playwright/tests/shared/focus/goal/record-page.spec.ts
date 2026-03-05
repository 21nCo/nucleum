import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal – record page (opening flows, visibility, tab switching) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.skip("open goal record page and assert panels/expected content visible", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO: open a goal from library or command, assert record page layout and panels
  });

  test.skip("tab switching and visibility check on goal record page", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO: switch tabs on goal record page and assert visibility
  });
});

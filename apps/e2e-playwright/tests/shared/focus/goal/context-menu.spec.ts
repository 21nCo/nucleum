import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal – context menu (all actions) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    test.skip("context menu actions from library goal row", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO: open Library → Goals, open context menu on a goal, assert and run each action
    });
  });

  test.describe("from record page", () => {
    test.skip("context menu actions from goal record page", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO: open goal record, open context menu, assert and run each action
    });
  });
});

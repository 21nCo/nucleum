import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - context menu (all actions) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    test.skip("context menu actions from library task row", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO
    });
  });

  test.describe("from record page", () => {
    test.skip("context menu actions from task record page", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO
    });
  });
});

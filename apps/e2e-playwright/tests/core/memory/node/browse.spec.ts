import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node – browse flows (from library, from pinned) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.skip("browse nodes from library", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO
  });

  test.skip("browse nodes from pinned resource browser", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO
  });
});

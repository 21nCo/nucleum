import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node - record page (opening, visibility, tab switching) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.skip("open node record and assert panels/content visible", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO
  });

  test.skip("tab switching and visibility on node record page", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO
  });
});

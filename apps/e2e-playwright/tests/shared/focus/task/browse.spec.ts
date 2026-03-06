import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - browse flows @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    test.skip("open Library → Tasks and see task in list", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO: create task, open Library → Tasks, assert task visible
    });
  });

  test.describe("from pinned resource browser", () => {
    test.skip("pin task and see in pinned list", async ({ page }) => {
      await ensureInAppOnHome(page);
      // TODO: pin task to quick focus (if supported), assert in pinned list
    });
  });
});

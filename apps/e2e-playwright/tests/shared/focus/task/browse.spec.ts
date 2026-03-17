import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  openLibraryAndTab,
  LibraryTab
} from "../../../utils/helpers";

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
    test("open Library → Tasks and see task in list", async ({ page }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      const taskName = `E2E browse task ${Date.now()}`;
      await runCommand(page, "Create a new task");
      const taskNameInput = page.getByTestId("task-name-input");
      await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await taskNameInput.fill(taskName);
      await page.keyboard.press("Enter");
      await taskNameInput
        .waitFor({ state: "hidden", timeout: 5_000 })
        .catch(() => null);
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(500);

      await openLibraryAndTab(page, LibraryTab.Tasks);
      await expect(
        page.getByRole("button", { name: taskName }).first()
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("from pinned resource browser", () => {
    test.skip("pin task and see in pinned list", async ({ page }) => {
      await ensureInAppOnHome(page);
      // App supports "Pin a goal to quick focus" only; tasks are not pinnable to a quick-focus list. N/A.
    });
  });
});

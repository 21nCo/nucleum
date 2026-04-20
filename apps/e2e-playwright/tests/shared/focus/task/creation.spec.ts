import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand, openLibraryAndTab, LibraryTab } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - creation flows @regression", () => {
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

  test("create task via command bar, then verify in Library", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task ${Date.now()}`;

    await runCommand(page, "Create a new task");
    const taskNameInput = page.getByTestId("task-name-input");
    await taskNameInput.waitFor({ state: "visible", timeout: 10_000 });
    await taskNameInput.fill(taskName);
    await page.keyboard.press("Enter");

    await taskNameInput
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(500);

    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Tasks(\s|$)/i }).click({
      timeout: 5_000
    });
    await page.waitForTimeout(1_500);

    await expect(
      page.getByRole("button", { name: taskName })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create task via UI (Library → Tasks → plus icon → name → Enter), then verify in list", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task ${Date.now()}`;

    await openLibraryAndTab(page, LibraryTab.Tasks);
    await page.waitForTimeout(1_000);

    const createTaskAction = page
      .getByRole("button", { name: /^(New task|Create task)(\s|$)/i })
      .first();
    await createTaskAction.click({ timeout: 8_000 });

    const taskNameInput = page.getByTestId("task-name-input");
    await taskNameInput.waitFor({ state: "visible", timeout: 10_000 });
    await taskNameInput.fill(taskName);

    await taskNameInput.press("Enter");

    await page.waitForTimeout(1_000);
    await expect(
      page.getByRole("button", { name: taskName })
    ).toBeVisible({ timeout: 10_000 });
  });
});

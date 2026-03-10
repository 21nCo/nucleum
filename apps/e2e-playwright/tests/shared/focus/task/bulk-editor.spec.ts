import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  selectFirstTwoViaContextMenu,
  createTwoTasks,
  getBulkEditBar
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - bulk editor @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("select multiple tasks via context menu - bulk edit bar appears and shows count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoTasks(page);
    await openLibraryAndTab(page, LibraryTab.Tasks);

    await selectFirstTwoViaContextMenu(page, "task-library");

    await expect(
      page.getByText(/Selected: 2 tasks?/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("select multiple tasks - clear selection hides bulk edit bar", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoTasks(page);
    await openLibraryAndTab(page, LibraryTab.Tasks);

    await selectFirstTwoViaContextMenu(page, "task-library");
    await expect(
      page.getByText(/Selected: 2 tasks?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Clear selection/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Selected: 2 tasks?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple tasks - Mark as completed shows success toast and clears selection", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoTasks(page);
    await openLibraryAndTab(page, LibraryTab.Tasks);

    await selectFirstTwoViaContextMenu(page, "task-library");
    await expect(
      page.getByText(/Selected: 2 tasks?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Mark as completed/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/2 tasks? successfully updated/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Selected: 2 tasks?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple tasks - Select all keeps bar visible with count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoTasks(page);
    await openLibraryAndTab(page, LibraryTab.Tasks);

    await selectFirstTwoViaContextMenu(page, "task-library");
    await expect(
      page.getByText(/Selected: 2 tasks?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Select all/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Selected: \d+ tasks?/i)).toBeVisible({
      timeout: 5_000
    });
  });
});

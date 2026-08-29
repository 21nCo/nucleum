import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  selectFirstTwoViaContextMenu,
  getBulkEditBar
} from "../../utils/helpers";
import {
  blockGoogleAccountsNavigation,
  openTaskLibrary
} from "../focus-test-helpers";
import {
  getResourceThumbnail,
  getResourceThumbnails,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("select multiple tasks via context menu - bulk edit bar appears and shows count @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.tasks(2, { prefix: "E2E bulk task" });
  await openTaskLibrary(page);

  await selectFirstTwoViaContextMenu(page, "task");

  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeVisible({
    timeout: 10_000
  });
});

test("select multiple tasks - clear selection hides bulk edit bar @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.tasks(2, { prefix: "E2E bulk task" });
  await openTaskLibrary(page);

  await selectFirstTwoViaContextMenu(page, "task");
  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /Clear selection/i })
    .click({ timeout: 5_000 });
  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeHidden({
    timeout: 5_000
  });
});

test("select multiple tasks - Mark as completed shows success toast and clears selection @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  const tasks = await e2eSeed.focus.tasks(2, { prefix: "E2E bulk task" });
  await openTaskLibrary(page);

  await selectFirstTwoViaContextMenu(page, "task");
  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /Mark as completed/i })
    .click({ timeout: 5_000 });
  await expect(page.getByText(/2 tasks? successfully updated/i)).toBeVisible({
    timeout: 10_000
  });
  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeHidden({
    timeout: 5_000
  });

  const completedButton = page.getByRole("button", {
    name: /Completed \(2\)/i
  });
  await expect(completedButton).toBeVisible({ timeout: 15_000 });
  await completedButton.click({ timeout: 5_000 });
  for (const task of tasks) {
    await expect(getResourceThumbnail(page, task.id)).toBeVisible({
      timeout: 15_000
    });
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openTaskLibrary(page);
  for (const task of tasks) {
    await expect(getResourceThumbnail(page, task.id)).toBeVisible({
      timeout: 15_000
    });
  }
});

test("select multiple tasks - Select all keeps bar visible with count @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.tasks(2, { prefix: "E2E bulk task" });
  await openTaskLibrary(page);

  requireResourceBrowseContract(test.info().project.name, "task");
  const thumbnails = getResourceThumbnails(page);
  await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
  const totalCount = await thumbnails.count();

  await selectFirstTwoViaContextMenu(page, "task");
  await expect(page.getByText(/Selected: 2 tasks?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /Select all/i })
    .click({ timeout: 5_000 });
  await expect(
    page.getByText(new RegExp(`Selected: ${totalCount} tasks?`, "i"))
  ).toBeVisible({ timeout: 5_000 });
});

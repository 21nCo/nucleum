import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  LibraryTab,
  openLibraryAndTab,
  runCommand
} from "../../utils/helpers";
import {
  blockGoogleAccountsNavigation,
  openTaskLibrary
} from "../focus-test-helpers";
import { readResourcesByLabel } from "../active-session/session-test-support";
import { getResourceThumbnail } from "../../utils/resource-matrix";

test.beforeEach(async ({ page }) => {
  await blockGoogleAccountsNavigation(page);
});

test("create task via command bar, then verify in Library @creation", async ({
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

  await expect
    .poll(
      async () => (await readResourcesByLabel(page, "task", taskName)).length,
      {
        message:
          "create task via command bar, then verify in Library @creation: toBe 1"
      }
    )
    .toBe(1);
  const createdTask = (await readResourcesByLabel(page, "task", taskName))[0];

  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(getResourceThumbnail(page, createdTask.id)).toBeVisible({
    timeout: 15_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(getResourceThumbnail(page, createdTask.id)).toBeVisible({
    timeout: 15_000
  });
});

test("create task via UI (Library → Tasks → plus icon → name → Enter), then verify in list @creation", async ({
  page
}) => {
  test.setTimeout(60_000);
  await ensureInAppOnHome(page);

  const taskName = `E2E task ${Date.now()}`;

  await openTaskLibrary(page);

  const createTaskAction = page
    .getByRole("button", { name: /^(New task|Create task)(\s|$)/i })
    .first();
  await createTaskAction.click({ timeout: 8_000 });

  const taskNameInput = page.getByTestId("task-name-input");
  await taskNameInput.waitFor({ state: "visible", timeout: 10_000 });
  await taskNameInput.fill(taskName);

  await taskNameInput.press("Enter");

  await expect
    .poll(
      async () => (await readResourcesByLabel(page, "task", taskName)).length,
      {
        message:
          "create task via UI (Library to Tasks to plus icon to name to...: toBe 1"
      }
    )
    .toBe(1);
  const createdTask = (await readResourcesByLabel(page, "task", taskName))[0];
  await expect(getResourceThumbnail(page, createdTask.id)).toBeVisible({
    timeout: 15_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openTaskLibrary(page);
  await expect(getResourceThumbnail(page, createdTask.id)).toBeVisible({
    timeout: 15_000
  });
});

import { expect, test, type Page } from "@playwright/test";
import { Product } from "@nucleum/client/config/product.type";
import {
  ensureInAppOnHome,
  LibraryTab,
  openLibraryAndTab,
  runCommand
} from "../utils/helpers";
import { fillCapture } from "../memory/memory-test-helpers";
import {
  getResourceThumbnailByLabel,
  getResourceThumbnails
} from "../utils/resource-matrix";

async function runNucleusSmokeFlow(page: Page) {
  const taskName = `E2E smoke task ${Date.now()}`;

  await openLibraryAndTab(page, LibraryTab.Tasks);
  await page
    .getByRole("button", { name: /^(New task|Create task)(\s|$)/i })
    .first()
    .click({ timeout: 10_000 });
  const taskNameInput = page.getByTestId("task-name-input");
  await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await taskNameInput.fill(taskName);
  await page.keyboard.press("Enter");
  await taskNameInput
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);

  const taskNameField = page.getByRole("textbox", {
    name: "Task name",
    exact: true
  });
  const taskThumbnail = getResourceThumbnails(page).filter({
    has: taskNameField
  });
  await expect(taskThumbnail).toHaveCount(1);
  await expect(taskThumbnail).toBeVisible();
  await expect(taskNameField).toHaveValue(taskName);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(taskThumbnail).toBeVisible({ timeout: 15_000 });
  await expect(taskNameField).toHaveValue(taskName);
}

async function runPointronSmokeFlow(page: Page) {
  const objectiveName = `E2E smoke objective ${Date.now()}`;

  await runCommand(page, "Create a new objective");
  const objectiveNameInput = page.getByTestId("objective-name-input");
  await objectiveNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await objectiveNameInput.fill(objectiveName);
  await page.keyboard.press("Enter");
  await objectiveNameInput
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);

  const objectiveRecord = page.getByTestId("resource-record-surface");
  await expect(objectiveRecord).toBeVisible({ timeout: 15_000 });
  await expect(
    objectiveRecord.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });

  await objectiveRecord
    .getByRole("button", { name: /^Close$/i })
    .first()
    .click({ timeout: 5_000 });
  await openLibraryAndTab(page, LibraryTab.Objectives);
  await expect(
    getResourceThumbnails(page).filter({ hasText: objectiveName })
  ).toHaveCount(1);
  await expect(getResourceThumbnailByLabel(page, objectiveName)).toBeVisible({
    timeout: 15_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openLibraryAndTab(page, LibraryTab.Objectives);
  await expect(getResourceThumbnailByLabel(page, objectiveName)).toBeVisible({
    timeout: 15_000
  });
}

async function runMemotronSmokeFlow(page: import("@playwright/test").Page) {
  const nodeText = `E2E smoke node ${Date.now()}`;

  await runCommand(page, "Capture");

  await fillCapture(page, nodeText);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }));
  await saveBtn.first().click({ timeout: 5_000 });

  const recordSurface = page.getByTestId("resource-record-surface");
  await expect(recordSurface).toBeVisible({ timeout: 15_000 });
  await expect(
    recordSurface.getByText(nodeText, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });

  const closeBtn = recordSurface.getByRole("button", { name: "Close" });
  await closeBtn.click({ timeout: 5_000 });

  await openLibraryAndTab(page, LibraryTab.Nodes);
  await expect(page.getByText(nodeText, { exact: false }).first()).toBeVisible({
    timeout: 15_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openLibraryAndTab(page, LibraryTab.Nodes);
  await expect(page.getByText(nodeText, { exact: false }).first()).toBeVisible({
    timeout: 15_000
  });
}

test.describe("primary flow smoke @smoke", () => {
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

  test("core create or open flow works for the current product", async ({
    page
  }, testInfo) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    if (testInfo.project.name === Product.MEMOTRON) {
      await runMemotronSmokeFlow(page);
      return;
    }

    if (testInfo.project.name === Product.POINTRON) {
      await runPointronSmokeFlow(page);
      return;
    }

    await runNucleusSmokeFlow(page);
  });
});

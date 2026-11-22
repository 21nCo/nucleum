import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  isCloudAuthModeActive,
  navigateToSurface
} from "../utils/helpers";
import { openResourceRecord } from "../utils/resource-matrix";
import {
  collectPageErrors,
  createObjectiveViaCommand
} from "./focus-test-helpers";

let e2eSeed: E2ESeed;

async function openObjectiveFromLibrary(page: Page, objectiveName: string) {
  await openResourceRecord(page, test.info().project.name, "objective", {
    label: objectiveName
  });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 15_000
  });
  await page.keyboard.press("Escape").catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
}

async function createManualFocusLog(page: Page, objectiveName: string) {
  await page.getByRole("button", { name: /command bar/i }).click({
    timeout: 5_000
  });
  const commandInput = page.getByTestId("command-bar-input");
  await commandInput.waitFor({ state: "visible", timeout: 15_000 });
  await commandInput.fill("Manual time entry");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Manual time entry").first()).toBeVisible({
    timeout: 10_000
  });
  const objectiveInput = page.getByPlaceholder(
    "Start typing to select objective"
  );
  await objectiveInput.waitFor({ state: "visible", timeout: 10_000 });
  await objectiveInput.fill(objectiveName);
  const manualEntryModal = page.locator("#MANUAL_FOCUS_ENTRY");
  const objectiveResult = page
    .locator("#MANUAL_FOCUS_ENTRY")
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  await objectiveResult.waitFor({ state: "visible", timeout: 10_000 });
  await objectiveResult.click({ timeout: 10_000, force: true });
  await expect(objectiveInput).toBeHidden({ timeout: 10_000 });
  await expect(
    manualEntryModal.getByText(objectiveName, { exact: true })
  ).toBeVisible({ timeout: 10_000 });

  const quickDurationButton = page
    .getByRole("button", { name: /last\s+10\s*min/i })
    .first();
  if (await quickDurationButton.isVisible().catch(() => false)) {
    await quickDurationButton.click({ timeout: 2_000 }).catch(() => null);
  }

  await page
    .locator("button")
    .filter({ hasText: /Save entries/i })
    .click({ timeout: 5_000 });
  await expect(manualEntryModal).toBeHidden({
    timeout: 10_000
  });
}

async function openCalendarActivityPanel(page: Page) {
  await navigateToSurface(page, "calendar.view.day", test.info().project.name);

  const goToToday = page.getByRole("button", { name: "Go to today" });
  if (await goToToday.isVisible()) {
    await goToToday.click();
  }

  const activityButton = page
    .getByRole("button", { name: /^Activity$/i })
    .or(page.getByRole("tab", { name: /^Activity$/i }))
    .first();
  await activityButton.waitFor({ state: "visible", timeout: 20_000 });
  await activityButton.click({ timeout: 5_000 });
}

async function expectActivityEntry(
  page: Page,
  label: string,
  actionPattern: RegExp
) {
  await expect(
    page
      .getByRole("button")
      .filter({ has: page.getByText(actionPattern) })
      .filter({ has: page.getByText(label, { exact: false }) })
      .filter({ visible: true })
      .first()
  ).toBeVisible({ timeout: 20_000 });
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
});

test("objective creation and opening appear in calendar activity", async ({
  page
}) => {
  test.setTimeout(90_000);

  const pageErrors = collectPageErrors(page);

  const objectiveName = `E2E calendar activity ${Date.now()}`;

  await ensureInAppOnHome(page);
  await createObjectiveViaCommand(page, { label: objectiveName });
  await openObjectiveFromLibrary(page, objectiveName);
  await openCalendarActivityPanel(page);

  await expectActivityEntry(page, objectiveName, /^Created$/);
  if (isCloudAuthModeActive()) {
    await expectActivityEntry(page, objectiveName, /^Opened$/);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openCalendarActivityPanel(page);
  await expectActivityEntry(page, objectiveName, /^Created$/);
  if (isCloudAuthModeActive()) {
    await expectActivityEntry(page, objectiveName, /^Opened$/);
  }
  expect(pageErrors).toEqual([]);
});

test("manual focus log appears in calendar activity", async ({ page }) => {
  test.setTimeout(90_000);

  const pageErrors = collectPageErrors(page);

  const objectiveName = `E2E calendar focus ${Date.now()}`;

  await ensureInAppOnHome(page);
  await e2eSeed.focus.objective({ label: objectiveName });
  await createManualFocusLog(page, objectiveName);
  await openCalendarActivityPanel(page);

  await expectActivityEntry(page, objectiveName, /^\u25cb Focus$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openCalendarActivityPanel(page);
  await expectActivityEntry(page, objectiveName, /^\u25cb Focus$/);
  expect(pageErrors).toEqual([]);
});

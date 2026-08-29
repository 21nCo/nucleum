import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";
import { openResourceBrowser } from "../../utils/resource-matrix";
import {
  assertFocusSessionInTimeline,
  blockGoogleAccountsNavigation,
  openQuickFocusPanelViaTopNav,
  waitForSessionElapsed
} from "../focus-test-helpers";

test.beforeEach(async ({ page }) => {
  await blockGoogleAccountsNavigation(page);
});

test("create objective via command bar, then start focus and verify in timeline @creation", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E test objective ${Date.now()}`;

  await runCommand(page, "Create a new objective");

  const objectiveNameInput = page.getByTestId("objective-name-input");
  await objectiveNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await objectiveNameInput.fill(objectiveName);
  await page.keyboard.press("Enter");

  await expect(objectiveNameInput).toBeHidden({ timeout: 10_000 });

  await openResourceBrowser(page, test.info().project.name, "objective");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openResourceBrowser(page, test.info().project.name, "objective");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await quickFocusSearch.fill(objectiveName);
  await quickFocusPanel
    .getByRole("button")
    .filter({ hasText: objectiveName })
    .first()
    .click({ timeout: 5_000 });

  const focusTimerButton = page.getByRole("button", {
    name: /^\d{1,2}:\d{2}$/
  });
  await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });
  await waitForSessionElapsed(page, 4);

  await runCommand(page, "Finish the current session");
  await page
    .getByText("Finish", { exact: true })
    .last()
    .click({ timeout: 5_000 });

  await page.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });

  await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });

  await assertFocusSessionInTimeline(page, objectiveName);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await assertFocusSessionInTimeline(page, objectiveName);
});

test("create objective via UI (Library → Objectives → New objective), then start and finish focus via Quick Focus, verify in timeline @creation", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E test objective ${Date.now()}`;

  await page
    .getByRole("button", { name: /^Library$/i })
    .click({ timeout: 5_000 });
  await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
    timeout: 10_000
  });
  await page
    .getByRole("button", { name: /^Objectives(\s+\d+)?$/i })
    .first()
    .click({
      timeout: 5_000
    });

  const newGoalBtn = page
    .getByRole("button", { name: /New objective/i })
    .first();
  const createNewGoalBtn = page
    .getByRole("button", { name: /Create new objective/i })
    .first();
  const clicked = await newGoalBtn
    .click({ timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (!clicked) {
    await createNewGoalBtn.click({ timeout: 5_000 });
  }

  const objectiveNameInput = page.getByTestId("objective-name-input");
  await objectiveNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await objectiveNameInput.fill(objectiveName);
  await page.keyboard.press("Enter");

  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openResourceBrowser(page, test.info().project.name, "objective");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });

  await page
    .getByRole("button", { name: /^Close$/i })
    .first()
    .click({ timeout: 5_000 })
    .catch(() => null);

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  const currentQuery = await quickFocusSearch.inputValue();
  if (!currentQuery.includes(objectiveName)) {
    await quickFocusSearch.fill(objectiveName);
  }

  const objectiveThumbnail = quickFocusPanel
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  await objectiveThumbnail.waitFor({ state: "visible", timeout: 15_000 });
  await objectiveThumbnail.click({ timeout: 5_000 });

  const focusTimerButton = page.getByRole("button", {
    name: /^\d{1,2}:\d{2}$/
  });
  await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });
  await waitForSessionElapsed(page, 4);

  const activeThumbnail = quickFocusPanel
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  await activeThumbnail.waitFor({ state: "visible", timeout: 10_000 });
  await activeThumbnail.click({ timeout: 5_000 });
  await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });

  await assertFocusSessionInTimeline(page, objectiveName);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await assertFocusSessionInTimeline(page, objectiveName);
});

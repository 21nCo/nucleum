import { expect, test } from "@playwright/test";
import type { ProductName } from "../../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  navigateToSurface,
  runCommand
} from "../../../utils/helpers";

function getProductName(projectName: string) {
  return projectName as ProductName;
}

async function createGoal(page: import("@playwright/test").Page, goalName: string) {
  const libraryButton = page.getByRole("button", { name: /^Library$/i }).first();
  await libraryButton.waitFor({ state: "visible", timeout: 10_000 });
  await libraryButton.click({ timeout: 5_000 });
  await expect(
    page.getByRole("textbox", { name: /Search (collections|goals|objectives)/i }).first()
  ).toBeVisible({ timeout: 15_000 });
  await page
    .getByRole("button", { name: /^(Goals|Objectives)(\s+\d+)?$/i })
    .first()
    .click({
      timeout: 5_000
    });
  await page.waitForTimeout(500);

  const newGoalButton = page.getByRole("button", { name: /New goal/i }).first();
  const createNewGoalButton = page
    .getByRole("button", { name: /Create new goal/i })
    .first();
  const clicked = await newGoalButton
    .click({ timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (!clicked) {
    await createNewGoalButton.click({ timeout: 5_000 });
  }

  const goalNameInput = page.getByTestId("goal-name-input");
  await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await goalNameInput.fill(goalName);
  await page.keyboard.press("Enter");
  await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
  await page
    .getByRole("button", { name: /^Close$/i })
    .first()
    .click({ timeout: 5_000 })
    .catch(() => null);
  await page.waitForTimeout(500);
}

function getPinnedGoal(
  scope: import("@playwright/test").Locator,
  goalName: string
) {
  return scope
    .locator("button")
    .filter({ hasText: goalName })
    .filter({ hasText: /Not focused today|Today:/i })
    .first();
}

test.describe("quick focus entrypoint @regression @feature @focus-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("open quick focus from top nav without page errors", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.ui.quickFocusPanel,
      "Quick focus panel is not part of this product contract"
    );

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.getByRole("button", { name: /^Focus$/i }).click({
      timeout: 5_000
    });
    await expect(page.getByTestId("quick-focus-search").first()).toBeVisible({
      timeout: 15_000
    });
    expect(pageErrors).toEqual([]);
  });

  test("remove a pinned goal via the declared quick-focus entrypoint", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.ui.quickFocusPanel,
      "Quick focus panel is not part of this product contract"
    );

    const goalName = `E2E quick focus ${Date.now()}`;
    await createGoal(page, goalName);
    await runCommand(page, "Pin a goal to quick focus");
    const pinSearchInput = page.getByTestId("command-bar-input");
    await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
    await pinSearchInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await pinSearchInput.waitFor({ state: "hidden", timeout: 10_000 });

    await navigateToSurface(page, "focus.quickFocus", projectName);

    const quickFocusPanel = page.getByTestId("quick-focus-panel").first();
    const quickFocusSearch = page.getByTestId("quick-focus-search").first();
    await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
    await quickFocusSearch.fill(goalName);
    await page.waitForTimeout(1_200);

    const pinnedGoal = getPinnedGoal(quickFocusPanel, goalName);
    await expect(pinnedGoal).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button", { name: /^Edit$/i })
      .first()
      .click({ timeout: 5_000 });
    await pinnedGoal.hover();
    await pinnedGoal.getByTestId("quick-focus-unpin-action").click({ timeout: 5_000 });
    await quickFocusSearch.clear();
    await page.waitForTimeout(1_000);
    await expect(pinnedGoal).toBeHidden({ timeout: 15_000 });
  });

  test("start quick focus from pinned goal and persist across reload without page errors", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.ui.quickFocusPanel,
      "Quick focus panel is not part of this product contract"
    );

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const goalName = `E2E quick focus persist ${Date.now()}`;
    await createGoal(page, goalName);
    await runCommand(page, "Pin a goal to quick focus");
    const pinSearchInput = page.getByTestId("command-bar-input");
    await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
    await pinSearchInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await pinSearchInput.waitFor({ state: "hidden", timeout: 10_000 });

    await page.getByRole("button", { name: /^Focus$/i }).click({
      timeout: 5_000
    });
    const quickFocusPanel = page.getByTestId("quick-focus-panel").first();
    const quickFocusSearch = page.getByTestId("quick-focus-search").first();
    await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
    await quickFocusSearch.fill(goalName);
    await page.waitForTimeout(1_200);

    const pinnedGoal = getPinnedGoal(quickFocusPanel, goalName);
    const pinnedGoalCard = quickFocusPanel
      .locator("button")
      .filter({ hasText: goalName })
      .first();
    await expect(pinnedGoal).toBeVisible({ timeout: 15_000 });
    await pinnedGoal.click({ timeout: 5_000 });
    await expect(pinnedGoalCard.getByText(/Now/i)).toBeVisible({
      timeout: 15_000
    });
    await expect(
      pinnedGoalCard.getByText(/^(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})$/).first()
    ).toBeVisible({
      timeout: 15_000
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await page.goto("/focus", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("quick-focus-panel").first()).toBeVisible({
      timeout: 15_000
    });
    const restoredQuickFocusSearch = page.getByTestId("quick-focus-search").first();
    await restoredQuickFocusSearch.fill(goalName);
    await page.waitForTimeout(1_200);
    const restoredPinnedGoalCard = page
      .getByTestId("quick-focus-panel")
      .first()
      .locator("button")
      .filter({ hasText: goalName })
      .first();
    await expect(restoredPinnedGoalCard.getByText(/Now/i)).toBeVisible({
      timeout: 15_000
    });
    await expect(
      restoredPinnedGoalCard
        .getByText(/^(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})$/)
        .first()
    ).toBeVisible({
      timeout: 15_000
    });
    expect(pageErrors).toEqual([]);
  });
});

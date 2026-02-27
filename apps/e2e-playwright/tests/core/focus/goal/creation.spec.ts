import { test, expect } from "@playwright/test";
import { nucleusProductConfig } from "../../../../config/nucleus-product.config";
import {
  ensureInAppOnHome,
  runCommand,
  runQuickFocusCommand
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal – creation flows @regression", () => {
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

  test("create goal via command bar, then start focus and verify in timeline", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E test goal ${Date.now()}`;

    await runCommand(page, "Create a new goal");

    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");

    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runQuickFocusCommand(page);
    const quickFocusSearch = page.getByTestId("command-bar-input");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 8_000 });
    await quickFocusSearch.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");

    await page
      .getByTestId("command-bar-input")
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => null);

    const focusTimerButton = page.getByRole("button", {
      name: /^\d{1,2}:\d{2}$/
    });
    await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });

    await page.waitForTimeout(4_000);

    await runCommand(page, "Finish the current session");
    await page
      .getByRole("button", { name: "Finish Win + Enter", exact: true })
      .click({ timeout: 5_000 });

    await page
      .getByRole("button", { name: /^Done/i })
      .click({ timeout: 5_000 });

    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForTimeout(1_500);

    await page
      .getByRole("button", {
        name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i")
      })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) =>
        new RegExp(
          `^\\/${nucleusProductConfig.homePath}(\\/.*)?$`
        ).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page
      .getByRole("button", { name: /^Today$/i })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => null);
    await page.waitForTimeout(2_000);

    await page
      .getByRole("button", { name: /^Close$/i })
      .first()
      .click({ timeout: 3_000 })
      .catch(() => null);
    await page.waitForTimeout(500);

    const timelineFocusEntry = page
      .locator("button")
      .filter({
        hasText: /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/
      })
      .first();
    await expect(timelineFocusEntry).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(goalName, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create goal via UI (Library → Goals → New goal), then start and finish focus via Quick Focus, verify in timeline", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E test goal ${Date.now()}`;

    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(500);

    const newGoalBtn = page.getByRole("button", { name: /New goal/i }).first();
    const createNewGoalBtn = page
      .getByRole("button", { name: /Create new goal/i })
      .first();
    const clicked = await newGoalBtn
      .click({ timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      await createNewGoalBtn.click({ timeout: 5_000 });
    }

    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");

    await page
      .getByRole("button", { name: /^Close$/i })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => null);
    await page.waitForTimeout(500);

    await page
      .getByRole("button", {
        name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i")
      })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^Focus$/i }).click({
      timeout: 5_000
    });
    const quickFocusSearch = page.getByTestId("quick-focus-search");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
    const currentQuery = await quickFocusSearch.inputValue();
    if (!currentQuery.includes(goalName)) {
      await quickFocusSearch.fill(goalName);
      await page.waitForTimeout(800);
    }

    const quickFocusPanel = page.locator("div").filter({
      has: quickFocusSearch
    });
    const goalThumbnail = quickFocusPanel
      .locator("button")
      .filter({ hasText: goalName })
      .first();
    await goalThumbnail.waitFor({ state: "visible", timeout: 15_000 });
    await goalThumbnail.click({ timeout: 5_000 });

    const focusTimerButton = page.getByRole("button", {
      name: /^\d{1,2}:\d{2}$/
    });
    await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });

    await page.waitForTimeout(4_000);

    const activeThumbnail = quickFocusPanel
      .locator("button")
      .filter({ hasText: goalName })
      .first();
    await activeThumbnail.waitFor({ state: "visible", timeout: 10_000 });
    await activeThumbnail.click({ timeout: 5_000 });

    await page.waitForTimeout(1_000);
    const timerStillVisible = await focusTimerButton
      .isVisible()
      .catch(() => false);
    if (timerStillVisible) {
      await focusTimerButton.click({ timeout: 5_000 });
      await page.waitForTimeout(500);
      await page
        .getByRole("button", { name: /^Finish$/i })
        .click({ timeout: 5_000 });
    }
    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForTimeout(1_000);

    await page
      .getByRole("button", {
        name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i")
      })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) =>
        new RegExp(
          `^\\/${nucleusProductConfig.homePath}(\\/.*)?$`
        ).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page
      .getByRole("button", { name: /^Today$/i })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => null);
    await page.waitForTimeout(2_000);

    await page
      .getByRole("button", { name: /^Close$/i })
      .first()
      .click({ timeout: 3_000 })
      .catch(() => null);
    await page.waitForTimeout(500);

    const timelineFocusEntry = page
      .locator("button")
      .filter({
        hasText: /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/
      })
      .first();
    await expect(timelineFocusEntry).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(goalName, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

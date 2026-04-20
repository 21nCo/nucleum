import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  getProductConfig,
  runCommand,
  runQuickFocusCommand
} from "../../utils/helpers";
import { openDeclaredSettingsPanel } from "../../utils/settings-contracts";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

test.describe("settings - focus panel @regression @feature @settings-feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("Focus panel is visible with declared controls", async ({ page }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.focusPanel,
      "Focus panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

    await expect(page.getByText(/^Focus$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText(/^Manual logs - Quick durations$/i).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/^Default break reminder$/i).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /^Add$/i }).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Focus quick durations persist after add", async ({ page }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.focusPanel,
      "Focus panel is not part of this product contract"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

    const quickAddInput = page.getByPlaceholder("Duration").first();
    await expect(quickAddInput).toBeVisible({ timeout: 5_000 });
    await quickAddInput.click();
    await quickAddInput.clear();
    await page.keyboard.type("25", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^Add$/i }).first().click({
      timeout: 5_000
    });
    await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
    await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Focus default break reminder persists", async ({ page }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.focusPanel,
      "Focus panel is not part of this product contract"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

    const breakReminderInput = page.getByPlaceholder("Duration").nth(1);
    await expect(breakReminderInput).toBeVisible({ timeout: 5_000 });
    await breakReminderInput.click();
    await breakReminderInput.clear();
    await page.keyboard.type("45", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
    await expect(page.getByPlaceholder("Duration").nth(1)).toHaveValue("45");
  });

  test("Focus PiP toggle state persists", async ({ page }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.focusPipToggle,
      "Focus PiP toggle is not part of this product contract"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

    const pipCheckbox = page.getByRole("checkbox", {
      name: /Automatically activate Picture-in-Picture|PiP on focus start/i
    });
    await expect(pipCheckbox).toBeVisible({ timeout: 10_000 });

    const wasChecked = await pipCheckbox.isChecked();
    await pipCheckbox.click({ timeout: 5_000 });
    await expect(pipCheckbox).toBeChecked({ checked: !wasChecked });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
    await expect(
      page.getByRole("checkbox", {
        name: /Automatically activate Picture-in-Picture|PiP on focus start/i
      })
    ).toBeChecked({ checked: !wasChecked });
  });

  test("Focus PiP/manual-log flow still works from the declared focus panel", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.focusPipToggle,
      "Focus PiP flow is not part of this product contract"
    );
    test.setTimeout(240_000);
    await ensureInAppOnHome(page);
    await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

    const quickAddInput = page.getByPlaceholder("Duration").first();
    await quickAddInput.click();
    await quickAddInput.clear();
    await page.keyboard.type("2", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Add$/i }).first().click({
      timeout: 5_000
    });
    await expect(page.getByText("2 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    const breakReminderInput = page.getByPlaceholder("Duration").nth(1);
    await breakReminderInput.click();
    await breakReminderInput.clear();
    await page.keyboard.type("1", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    const pipRow = page
      .locator("div")
      .filter({
        hasText:
          /Automatically activate Picture-in-Picture \(PiP\) on focus start/
      })
      .filter({ has: page.locator('input[type="checkbox"]') })
      .last();
    const pipInput = pipRow.locator('input[type="checkbox"]').first();
    const pipSettingExists = (await pipInput.count()) > 0;
    if (pipSettingExists) {
      if (!(await pipInput.isChecked())) {
        await pipRow.locator("label:has(input[type='checkbox'])").click({
          timeout: 5_000
        });
        await page.waitForTimeout(300);
      }
      await expect(pipInput).toBeChecked({ timeout: 3_000 });
    }

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const goalName = `E2E focus verify ${Date.now()}`;
    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await runQuickFocusCommand(page);
    const cmdInput = page.getByTestId("command-bar-input");
    await cmdInput.waitFor({ state: "visible", timeout: 10_000 });
    await cmdInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1_500);

    const focusTimerButton = page.getByRole("button", {
      name: /^\d{1,2}:\d{2}$/
    });

    if (pipSettingExists) {
      await page.waitForTimeout(2_000);
      const isPipWindowOpen = await page.evaluate(() => {
        try {
          return !!(window as any).documentPictureInPicture?.window;
        } catch {
          return false;
        }
      });

      if (isPipWindowOpen) {
        await expect(page.locator("#playercontainer #focusplayer")).toHaveCount(0);
      } else {
        await expect(focusTimerButton).toBeVisible({ timeout: 5_000 });
      }
    } else {
      await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });
    }

    await runCommand(page, "Finish the current session");
    await page
      .getByRole("button", { name: "Finish Win + Enter", exact: true })
      .click({ timeout: 5_000 });
    await page.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });
    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => null);
    await page.waitForTimeout(1_000);

    await runCommand(page, "Focus");
    await page.getByRole("button", { name: /Add manual log/i }).click({
      timeout: 10_000
    });
    await expect(page.getByText("Manual time entry").first()).toBeVisible({
      timeout: 10_000
    });
    const goalInput = page.getByPlaceholder("Start typing to select goal");
    await goalInput.waitFor({ state: "visible", timeout: 5_000 });
    await goalInput.fill(goalName);
    await page.waitForTimeout(1_000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await expect(
      page.getByText("Choose quick duration", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /last\s+2\s*min/i }).first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(300);
    await page.locator("button").filter({ hasText: /Save entries/i }).click({
      timeout: 5_000
    });
    await page.waitForTimeout(1_500);

    await runQuickFocusCommand(page);
    const cmdInput2 = page.getByTestId("command-bar-input");
    await cmdInput2.waitFor({ state: "visible", timeout: 10_000 });
    await cmdInput2.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2_000);

    await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Its been|consider taking a short break/i).first()
    ).toBeVisible({ timeout: 65_000 });
  });
});

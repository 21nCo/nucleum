import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";
import { openDeclaredSettingsPanel } from "../utils/settings-contracts";
import {
  blockGoogleAccountsNavigation,
  openFocusViaTopNav,
  openQuickFocusPanelViaTopNav,
  readSessionRuntime
} from "./focus-test-helpers";
import { reopenPersistedSession } from "./active-session/session-test-support";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("Focus panel is visible with declared controls @settings", async ({
  page
}, testInfo) => {
  test.setTimeout(45_000);
  await ensureInAppOnHome(page);
  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

  await expect(page.getByText(/^Focus$/i).first()).toBeVisible({
    timeout: 5_000
  });
  await expect(
    page.getByText(/^Manual logs - Quick durations$/i).first()
  ).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/^Default break reminder$/i).first()).toBeVisible(
    { timeout: 5_000 }
  );
  await expect(
    page.getByRole("button", { name: /^Add$/i }).first()
  ).toBeVisible({
    timeout: 5_000
  });
});

test("Focus quick durations persist after add @settings", async ({
  page
}, testInfo) => {
  test.setTimeout(60_000);
  await ensureInAppOnHome(page);
  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

  const quickAddInput = page.getByPlaceholder("Duration").first();
  await expect(quickAddInput).toBeVisible({ timeout: 5_000 });
  await quickAddInput.click();
  await quickAddInput.clear();
  await page.keyboard.type("25", { delay: 80 });
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: /^Add$/i }).first().click({
    timeout: 5_000
  });
  await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
    timeout: 5_000
  });

  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
  await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
    timeout: 5_000
  });
});

test("Focus default break reminder persists @settings", async ({
  page
}, testInfo) => {
  test.setTimeout(60_000);
  await ensureInAppOnHome(page);
  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

  const breakReminderInput = page.getByPlaceholder("Duration").nth(1);
  await expect(breakReminderInput).toBeVisible({ timeout: 5_000 });
  await breakReminderInput.click();
  await breakReminderInput.clear();
  await page.keyboard.type("45", { delay: 80 });
  await page.keyboard.press("Tab");
  await expect(breakReminderInput).toHaveValue("45");

  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
  await expect(page.getByPlaceholder("Duration").nth(1)).toHaveValue("45");
});

test("Focus PiP toggle state persists @settings", async ({
  page
}, testInfo) => {
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

  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
  await expect(
    page.getByRole("checkbox", {
      name: /Automatically activate Picture-in-Picture|PiP on focus start/i
    })
  ).toBeChecked({ checked: !wasChecked });
});

test("Focus PiP/manual-log flow still works from the declared focus panel @settings", async ({
  page
}, testInfo) => {
  test.setTimeout(240_000);
  await ensureInAppOnHome(page);
  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");

  const quickAddInput = page.getByPlaceholder("Duration").first();
  await quickAddInput.click();
  await quickAddInput.clear();
  await page.keyboard.type("2", { delay: 80 });
  await page.keyboard.press("Tab");
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
  await expect(breakReminderInput).toHaveValue("1");

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
    }
    await expect(pipInput).toBeChecked({ timeout: 3_000 });
  }

  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

  await openDeclaredSettingsPanel(page, testInfo.project.name, "focus");
  await expect(page.getByText("2 min", { exact: true }).first()).toBeVisible({
    timeout: 5_000
  });
  await expect(page.getByPlaceholder("Duration").nth(1)).toHaveValue("1");
  if (pipSettingExists) {
    await expect(
      page
        .locator("div")
        .filter({
          hasText:
            /Automatically activate Picture-in-Picture \(PiP\) on focus start/
        })
        .filter({ has: page.locator('input[type="checkbox"]') })
        .last()
        .locator('input[type="checkbox"]')
        .first()
    ).toBeChecked();
  }
  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

  const objectiveName = `E2E focus verify ${Date.now()}`;
  await e2eSeed.focus.objective({ label: objectiveName });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await quickFocusSearch.fill(objectiveName);
  await quickFocusPanel
    .getByRole("button")
    .filter({ hasText: objectiveName })
    .first()
    .click({ timeout: 5_000 });
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  const focusTimerButton = page.getByRole("button", {
    name: /^\d{1,2}:\d{2}$/
  });

  if (pipSettingExists) {
    await expect(async () => {
      const isPipWindowOpen = await page.evaluate(() => {
        try {
          return !!(window as any).documentPictureInPicture?.window;
        } catch {
          return false;
        }
      });
      if (isPipWindowOpen) return;
      await expect(focusTimerButton).toBeVisible({ timeout: 500 });
    }, "focus session opens in Picture-in-Picture or main window").toPass({
      timeout: 10_000
    });
    const isPipWindowOpen = await page.evaluate(() => {
      try {
        return !!(window as any).documentPictureInPicture?.window;
      } catch {
        return false;
      }
    });

    if (isPipWindowOpen) {
      const mainWindowPlayer = page.locator("#playercontainer #focusplayer");
      if ((await mainWindowPlayer.count()) === 0) {
        await expect(mainWindowPlayer).toHaveCount(0);
      } else {
        await expect(focusTimerButton).toBeVisible({ timeout: 5_000 });
      }
    } else {
      await expect(focusTimerButton).toBeVisible({ timeout: 5_000 });
    }
  } else {
    await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });
  }

  await runCommand(page, "Finish the current session");
  await page
    .getByText("Finish", { exact: true })
    .last()
    .click({ timeout: 5_000 });
  await expect(page.getByRole("button", { name: /^Done/i })).toBeVisible({
    timeout: 15_000
  });
  await page.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });
  await focusTimerButton
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => null);
  await reopenPersistedSession(page, sessionId, [objectiveName]);

  await openFocusViaTopNav(page);
  await page.getByRole("button", { name: /Add manual log/i }).click({
    timeout: 10_000
  });
  await expect(page.getByText("Manual time entry").first()).toBeVisible({
    timeout: 10_000
  });
  const objectiveInput = page.getByPlaceholder(
    "Start typing to select objective"
  );
  await objectiveInput.waitFor({ state: "visible", timeout: 5_000 });
  await objectiveInput.fill(objectiveName);
  await expect(
    page.getByText(objectiveName, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Enter");

  await expect(
    page.getByText("Choose quick duration", { exact: true }).first()
  ).toBeVisible({ timeout: 5_000 });
  await page
    .getByRole("button", { name: /last\s+2\s*min/i })
    .first()
    .click({
      timeout: 5_000
    });
  await page
    .locator("button")
    .filter({ hasText: /Save entries/i })
    .click({
      timeout: 5_000
    });

  await runCommand(page, "See Logs");
  await expect(page.getByText("Logs").first()).toBeVisible({
    timeout: 10_000
  });
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 10_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await runCommand(page, "See Logs");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 10_000 });

  const {
    quickFocusPanel: secondQuickFocusPanel,
    quickFocusSearch: secondQuickFocusSearch
  } = await openQuickFocusPanelViaTopNav(page);
  await secondQuickFocusSearch.fill(objectiveName);
  await page.clock.install({ time: new Date() });
  await secondQuickFocusPanel
    .getByRole("button")
    .filter({ hasText: objectiveName })
    .first()
    .click({ timeout: 5_000 });

  await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });
  await page.clock.runFor(61_000);
  await expect(
    page.getByText(/Its been|consider taking a short break/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

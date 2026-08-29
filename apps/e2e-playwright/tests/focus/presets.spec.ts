import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";
import { expectAnyLocatorVisible } from "../utils/locator-assertions";
import {
  addFocusPreset as addPreset,
  collectPageErrors,
  ensureAdvancedFocus,
  fillDurationInput,
  fillInputValue,
  removeFocusPresetsByNamePrefix,
  resetFocusSession,
  selectCustomMode,
  selectDurationTab
} from "./focus-test-helpers";

let e2eSeed: E2ESeed;

function getEditPresetModal(page: Page) {
  return page.locator("#EDIT_PRESET-modal");
}

function getSavePresetModal(page: Page) {
  return page.locator("#SAVE_PRESET-modal");
}

async function isLocatorVisible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

function getPresetManagerControls(root: Page | Locator) {
  return {
    closeEditorButton: root
      .getByRole("button", { name: /^Close editor$/i })
      .first(),
    editButton: root.getByRole("button", { name: /^Edit$/i }).first()
  };
}

async function isPresetManagerOpen(page: Page) {
  const { editButton, closeEditorButton } = getPresetManagerControls(page);
  return (
    (await isLocatorVisible(editButton)) ||
    (await isLocatorVisible(closeEditorButton))
  );
}

async function waitForPresetManager(page: Page) {
  const { editButton, closeEditorButton } = getPresetManagerControls(page);
  await expectAnyLocatorVisible([editButton, closeEditorButton], {
    message: "preset manager exposes edit or close controls",
    timeout: 15_000
  });
}

async function openPresetEditorFromCommand(page: Page) {
  await runCommand(page, "Create a new preset");
  const modal = getEditPresetModal(page);
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(
    modal.getByPlaceholder("Give preset a name or leave it blank").last()
  ).toBeVisible({ timeout: 15_000 });
}

async function openPresetManager(page: Page) {
  if (await isPresetManagerOpen(page)) {
    return page;
  }
  await ensureAdvancedFocus(page);
  if (await isPresetManagerOpen(page)) {
    return page;
  }
  await page
    .getByRole("button", { name: /^Presets$/i })
    .first()
    .click();
  await waitForPresetManager(page);
  return page;
}

function getPresetCard(root: Page | Locator, name: string) {
  return root.getByRole("button").filter({ hasText: name }).first();
}

async function expectPresetVisibleInManager(
  page: Page,
  name: string,
  text?: RegExp
) {
  const modal = await openPresetManager(page);
  const presetCard = getPresetCard(modal, name);
  await expect(presetCard).toBeVisible({ timeout: 15_000 });
  if (text) {
    await expect(presetCard).toContainText(text, { timeout: 15_000 });
  }
  return presetCard;
}

async function expectPresetHiddenInManager(page: Page, name: string) {
  const modal = await openPresetManager(page);
  await expect(getPresetCard(modal, name)).toBeHidden({ timeout: 15_000 });
}

async function enablePresetManagerEditMode(page: Page) {
  const modal = await openPresetManager(page);
  const editHint = modal.getByText("Tap the preset to edit", { exact: true });
  if (!(await editHint.isVisible().catch(() => false))) {
    await getPresetManagerControls(modal).editButton.click({ timeout: 5_000 });
  }
  await expect(editHint).toBeVisible({ timeout: 10_000 });
  return modal;
}

async function openPresetForEdit(page: Page, name: string) {
  const managerModal = await enablePresetManagerEditMode(page);
  const presetCard = getPresetCard(managerModal, name);
  await expect(presetCard).toBeVisible({ timeout: 15_000 });
  await presetCard.click({ timeout: 5_000 });
  const editModal = getEditPresetModal(page);
  await expect(editModal).toBeVisible({ timeout: 15_000 });
  await expect(
    editModal.getByPlaceholder("Give preset a name or leave it blank").last()
  ).toBeVisible({ timeout: 15_000 });
}

async function openPresetEditorFromManager(page: Page) {
  const manager = await enablePresetManagerEditMode(page);
  await manager
    .getByRole("button", { name: /^Add new preset$/i })
    .click({ timeout: 5_000 });
  const editModal = getEditPresetModal(page);
  await expect(editModal).toBeVisible({ timeout: 15_000 });
  await expect(
    editModal.getByPlaceholder("Give preset a name or leave it blank").last()
  ).toBeVisible({ timeout: 15_000 });
}

async function expectPresetEditorName(page: Page, name: string) {
  await expect(
    getEditPresetModal(page)
      .getByPlaceholder("Give preset a name or leave it blank")
      .last()
  ).toHaveValue(name, { timeout: 10_000 });
}

async function expectDurationInputValue(
  root: Page | Locator,
  testId: string,
  value: string | RegExp
) {
  await expect(root.getByTestId(testId).locator("input").first()).toHaveValue(
    value,
    { timeout: 10_000 }
  );
}

async function expectDurationTabSelected(page: Page, name: string) {
  await expect(
    getEditPresetModal(page).getByTestId("composition-mode-config")
  ).toHaveAttribute("data-composition-mode", new RegExp(`^${name}$`, "i"), {
    timeout: 10_000
  });
}

function getPomodoroRoundsInput(page: Page) {
  return getEditPresetModal(page).getByPlaceholder("rounds").first();
}

function getPomodoroDurationInput(page: Page, index: number) {
  return getEditPresetModal(page).getByPlaceholder("Duration").nth(index);
}

async function fillPomodoroFields(
  page: Page,
  values: { breakDuration: string; focusDuration: string; rounds: string }
) {
  await fillInputValue(getPomodoroRoundsInput(page), values.rounds);
  await fillInputValue(getPomodoroDurationInput(page, 0), values.focusDuration);
  await fillInputValue(getPomodoroDurationInput(page, 1), values.breakDuration);
}

async function expectPomodoroFields(
  page: Page,
  values: { breakDuration: string; focusDuration: string; rounds: string }
) {
  await expect(getPomodoroRoundsInput(page)).toHaveValue(values.rounds, {
    timeout: 10_000
  });
  await expect(getPomodoroDurationInput(page, 0)).toHaveValue(
    values.focusDuration,
    { timeout: 10_000 }
  );
  await expect(getPomodoroDurationInput(page, 1)).toHaveValue(
    values.breakDuration,
    { timeout: 10_000 }
  );
}

async function fillPresetName(page: Page, name: string) {
  const nameInput = getEditPresetModal(page)
    .getByPlaceholder("Give preset a name or leave it blank")
    .last();
  await nameInput.click();
  await nameInput.press("ControlOrMeta+A");
  await nameInput.type(name);
  await expect(nameInput).toHaveValue(name, { timeout: 10_000 });
  await nameInput.press("Tab");
}

async function savePresetEditor(page: Page) {
  const modal = getEditPresetModal(page);
  await modal.getByRole("button", { name: /^Save/i }).click({ timeout: 5_000 });
  await expect(modal)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => null);
}

async function deletePresetEditor(page: Page) {
  const modal = getEditPresetModal(page);
  await modal
    .getByRole("button", { name: /^Delete/i })
    .click({ timeout: 5_000 });
  await expect(modal)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => null);
}

async function openSaveAsPresetModal(page: Page) {
  await page
    .getByTestId("composition-save-as-preset")
    .first()
    .click({ timeout: 5_000 });
  const modal = getSavePresetModal(page);
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await expect(modal.getByText("Save as preset", { exact: true })).toBeVisible({
    timeout: 10_000
  });
}

async function saveCurrentCompositionPreset(page: Page, name: string) {
  const modal = getSavePresetModal(page);
  await modal.getByPlaceholder("Preset name or leave empty").fill(name);
  await page.keyboard.press("Meta+Enter");
  await expect(modal)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => null);
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
  await removeFocusPresetsByNamePrefix(page, "E2E preset ");
});

test.afterEach(async ({ page }) => {
  await removeFocusPresetsByNamePrefix(page, "E2E preset ").catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

test("create preset from the preset editor and list it in preset manager", async ({
  page
}) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset create ${Date.now()}`;

  await openPresetEditorFromManager(page);
  await selectDurationTab(page, "Countdown");
  await fillDurationInput(
    getEditPresetModal(page),
    "advanced-focus-total-duration",
    "45"
  );
  await fillPresetName(page, presetName);
  await savePresetEditor(page);

  await expectPresetVisibleInManager(page, presetName, /Total:\s*45\s*m/i);
  await ensureAdvancedFocus(page, { reload: true });
  await expectPresetVisibleInManager(page, presetName, /Total:\s*45\s*m/i);
  await openPresetForEdit(page, presetName);
  await expectPresetEditorName(page, presetName);
  await expectDurationInputValue(
    getEditPresetModal(page),
    "advanced-focus-total-duration",
    "45"
  );
  expect(pageErrors).toEqual([]);
});

test("create countup preset from the preset editor", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset countup ${Date.now()}`;

  await openPresetEditorFromManager(page);
  await selectDurationTab(page, "Countup");
  await expectDurationTabSelected(page, "Countup");
  await fillPresetName(page, presetName);
  await savePresetEditor(page);

  await expectPresetVisibleInManager(page, presetName, /Count up/i);
  await openPresetForEdit(page, presetName);
  await expectPresetEditorName(page, presetName);
  await expectDurationTabSelected(page, "Countup");
  expect(pageErrors).toEqual([]);
});

test("create pomodoro preset from the preset editor", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset pomodoro ${Date.now()}`;
  const pomodoroValues = {
    breakDuration: "5",
    focusDuration: "25",
    rounds: "3"
  };

  await openPresetEditorFromManager(page);
  await selectDurationTab(page, "Pomodoro");
  await expectDurationTabSelected(page, "Pomodoro");
  await fillPomodoroFields(page, pomodoroValues);
  await fillPresetName(page, presetName);
  await savePresetEditor(page);

  const presetCard = await expectPresetVisibleInManager(
    page,
    presetName,
    /Focus:\s*3\s*x\s*25\s*m/i
  );
  await expect(presetCard).toContainText(/Break:\s*5\s*m/i, {
    timeout: 15_000
  });
  await openPresetForEdit(page, presetName);
  await expectPresetEditorName(page, presetName);
  await expectDurationTabSelected(page, "Pomodoro");
  await expectPomodoroFields(page, pomodoroValues);
  expect(pageErrors).toEqual([]);
});

test("create predefined-break countdown preset from the preset editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset predefined ${Date.now()}`;

  await openPresetEditorFromManager(page);
  await selectDurationTab(page, "Countdown");
  await fillDurationInput(
    getEditPresetModal(page),
    "advanced-focus-total-duration",
    "90"
  );
  await getEditPresetModal(page)
    .getByRole("button", { name: /^Predefined$/i })
    .click({ timeout: 5_000 });
  await fillInputValue(
    getEditPresetModal(page).getByTestId("advanced-focus-number-of-breaks"),
    "2"
  );
  await fillDurationInput(
    getEditPresetModal(page),
    "advanced-focus-break-duration",
    "10"
  );
  await fillPresetName(page, presetName);
  await savePresetEditor(page);

  await expectPresetVisibleInManager(
    page,
    presetName,
    /Total:\s*1\s*h\s*30\s*m/i
  );
  await openPresetForEdit(page, presetName);
  await expectPresetEditorName(page, presetName);
  await expectDurationTabSelected(page, "Countdown");
  await expectDurationInputValue(
    getEditPresetModal(page),
    "advanced-focus-total-duration",
    "1.5"
  );
  await expect(
    getEditPresetModal(page).getByTestId("advanced-focus-number-of-breaks")
  ).toHaveValue("2", { timeout: 10_000 });
  await expectDurationInputValue(
    getEditPresetModal(page),
    "advanced-focus-break-duration",
    "10"
  );
  expect(pageErrors).toEqual([]);
});

test("edit preset name and composition from preset manager", async ({
  page
}) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset edit ${Date.now()}`;
  const updatedName = `E2E preset updated ${Date.now()}`;
  await addPreset(page, {
    name: presetName,
    type: "Total duration",
    focusDuration: 0,
    breakDuration: 0,
    totalDuration: 30 * 60,
    breakReminder: 10 * 60,
    numberOfBreaks: 0,
    breakType: "Reminder"
  });

  await openPresetForEdit(page, presetName);
  await fillDurationInput(
    getEditPresetModal(page),
    "advanced-focus-total-duration",
    "75"
  );
  await fillPresetName(page, updatedName);
  await savePresetEditor(page);

  await expectPresetVisibleInManager(
    page,
    updatedName,
    /Total:\s*1\s*h\s*15\s*m/i
  );
  await expectPresetHiddenInManager(page, presetName);
  await ensureAdvancedFocus(page, { reload: true });
  await expectPresetVisibleInManager(
    page,
    updatedName,
    /Total:\s*1\s*h\s*15\s*m/i
  );
  await expectPresetHiddenInManager(page, presetName);
  expect(pageErrors).toEqual([]);
});

test("delete preset from the preset editor", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset delete ${Date.now()}`;
  await addPreset(page, {
    name: presetName,
    type: "Total duration",
    focusDuration: 0,
    breakDuration: 0,
    totalDuration: 20 * 60,
    breakReminder: 10 * 60,
    numberOfBreaks: 0,
    breakType: "Reminder"
  });

  await openPresetForEdit(page, presetName);
  await deletePresetEditor(page);

  await expectPresetHiddenInManager(page, presetName);
  await ensureAdvancedFocus(page, { reload: true });
  await expectPresetHiddenInManager(page, presetName);
  expect(pageErrors).toEqual([]);
});

test("save current custom composition as a preset", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset saved composition ${Date.now()}`;

  await ensureAdvancedFocus(page);
  await selectCustomMode(page);
  await selectDurationTab(page, "Countdown");
  await fillDurationInput(page, "advanced-focus-total-duration", "1");
  await openSaveAsPresetModal(page);
  await saveCurrentCompositionPreset(page, presetName);

  await expectPresetVisibleInManager(page, presetName, /Total:\s*1\s*h/i);
  await ensureAdvancedFocus(page, { reload: true });
  await expectPresetVisibleInManager(page, presetName, /Total:\s*1\s*h/i);
  expect(pageErrors).toEqual([]);
});

test("create preset with selected objective", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = collectPageErrors(page);
  const presetName = `E2E preset objective ${Date.now()}`;
  const objective = await e2eSeed.focus.objective({
    label: `E2E preset objective item ${Date.now()}`
  });
  const objectiveName = objective.label;

  await openPresetEditorFromCommand(page);
  await fillPresetName(page, presetName);
  const objectiveInput = page.getByPlaceholder(
    "Start typing to search for objectives"
  );
  await objectiveInput.fill(objectiveName);
  await expect(
    getEditPresetModal(page).getByText(objectiveName, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Enter");
  await expect(
    getEditPresetModal(page).getByText(objectiveName, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await savePresetEditor(page);

  await expectPresetVisibleInManager(page, presetName, /1 objective/i);
  await openPresetForEdit(page, presetName);
  await expect(
    getEditPresetModal(page).getByText(objectiveName, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  expect(pageErrors).toEqual([]);
});

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  collectPageErrors,
  ensureAdvancedFocus,
  reloadActiveSession,
  resetFocusSession,
  startAdvancedFocus
} from "../focus-test-helpers";
import { getCurrentFocusItemRow } from "./session-test-support";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
});

test("render objective focus items in running focus view after session start", async ({
  page
}) => {
  test.setTimeout(120_000);

  const pageErrors = collectPageErrors(page);
  const objectiveLabel = `E2E advanced focus ${Date.now()}`;

  await e2eSeed.focus.objective({ label: objectiveLabel });
  await ensureAdvancedFocus(page);
  await addAdvancedFocusItems(page, [objectiveLabel]);
  await startAdvancedFocus(page);

  await expect(
    page.getByText(objectiveLabel, { exact: true }).first()
  ).toBeVisible({
    timeout: 15_000
  });
  const currentGoalRow = getCurrentFocusItemRow(page, objectiveLabel);
  await expect(currentGoalRow).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByText(/No focus items added\./i)).toBeHidden({
    timeout: 15_000
  });
  await expect(page.getByText(/CURRENT FOCUS/i).first()).toBeVisible({
    timeout: 15_000
  });

  await reloadActiveSession(page);
  await expect(getCurrentFocusItemRow(page, objectiveLabel)).toBeVisible({
    timeout: 15_000
  });

  expect(pageErrors).toEqual([]);
});

test("render task focus items in running focus view after task start", async ({
  page
}) => {
  test.setTimeout(120_000);

  const pageErrors = collectPageErrors(page);
  const taskLabel = `E2E task focus task ${Date.now()}`;

  await e2eSeed.focus.task({ label: taskLabel });
  await ensureAdvancedFocus(page);
  await addAdvancedFocusItems(page, [taskLabel]);
  await startAdvancedFocus(page);

  const currentTaskRow = getCurrentFocusItemRow(page, taskLabel);

  await expect(page.getByText(taskLabel, { exact: true }).first()).toBeVisible({
    timeout: 15_000
  });
  await expect(currentTaskRow).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByText(/CURRENT FOCUS/i).first()).toBeVisible({
    timeout: 15_000
  });

  await reloadActiveSession(page);
  await expect(getCurrentFocusItemRow(page, taskLabel)).toBeVisible({
    timeout: 15_000
  });

  expect(pageErrors).toEqual([]);
});

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  readSessionRuntime,
  reloadActiveSession,
  resetFocusSession,
  startAdvancedFocus,
  waitForSessionElapsed
} from "../focus-test-helpers";
import {
  dismissFinishedSession,
  finishSessionFromControl,
  getFocusItemRow,
  readPersistedSession,
  reopenPersistedSession,
  selectFocusItem,
  setEditMode,
  setSessionEditMode
} from "./session-test-support";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
  await setEditMode(page, false);
});

test.afterEach(async ({ page }) => {
  await setEditMode(page, false).catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

test("restores an active advanced session across reload", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E reload" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const before = await readSessionRuntime(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);

  await expect
    .poll(async () => (await readSessionRuntime(page)).currentSessionId, {
      message:
        "restores an active advanced session across reload: toBe before.currentSessionId"
    })
    .toBe(before.currentSessionId);
  const restored = await readSessionRuntime(page);
  expect(restored.isSessionRunning).toBe(true);
  expect(restored.currentFocusItem?.id).toBe(fixture.objective.id);
  await expect
    .poll(async () => (await readSessionRuntime(page)).totalElapsed, {
      message:
        "restores an active advanced session across reload: toBeGreaterThan 0"
    })
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: /^\d{2}:\d{2}(?::\d{2})?$/ }).last()
  ).toBeVisible();
});

test("restores a running break without duplicating intervals", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E reload break"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  const before = await readSessionRuntime(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);

  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "restores a running break without duplicating intervals: toBe 3"
    })
    .toBe(3);
  await expect(
    page.getByRole("button", { name: /^\d{2}:\d{2}(?::\d{2})?$/ }).last()
  ).toBeVisible();
  const restored = await readSessionRuntime(page);
  expect(restored.currentBlockId).toBe(before.currentBlockId);
  expect(restored.intervals).toHaveLength(before.intervals.length);
});

test("keeps the global timer active while navigating away", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E navigate active"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await page.keyboard.press("Escape").catch(() => null);
  await page
    .getByRole("button", { name: /^Calendar$/i })
    .first()
    .click({ timeout: 5_000 });

  const topNavTimer = page
    .getByRole("button", { name: /^\d{2}:\d{2}(?::\d{2})?$/ })
    .last();
  await expect(topNavTimer).toBeVisible({ timeout: 15_000 });
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(true);

  await reloadActiveSession(page);
  await expect(getFocusItemRow(page, fixture.objective.label)).toBeVisible();
});

test("persists nested and standalone task relations with correct logs", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    standaloneTaskCount: 1,
    prefix: "E2E relation"
  });
  const nestedTask = fixture.nestedTasks[0];
  const standaloneTask = fixture.standaloneTasks[0];
  await addAdvancedFocusItems(page, [nestedTask.label, standaloneTask.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  await selectFocusItem(page, standaloneTask.label, standaloneTask.id);
  await waitForSessionElapsed(page, 2);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await finishSessionFromControl(page);
  await expect
    .poll(
      async () => (await readPersistedSession(page, sessionId)).session?.id,
      {
        message:
          "persists nested and standalone task relations with correct logs: toBe sessionId",
        timeout: 20_000
      }
    )
    .toBe(sessionId);
  const persisted = await readPersistedSession(page, sessionId);
  await dismissFinishedSession(page);

  expect(persisted.session?.items.map((item) => item.id)).toEqual([
    fixture.objective.id,
    nestedTask.id,
    standaloneTask.id
  ]);
  expect(
    persisted.logs.some(
      (log) =>
        log.taskId === nestedTask.id &&
        log.objectiveId === fixture.objective.id &&
        log.focus > 0
    )
  ).toBe(true);
  await reopenPersistedSession(page, sessionId, [
    fixture.objective.label,
    nestedTask.label,
    standaloneTask.label
  ]);
  expect(
    persisted.logs.some(
      (log) =>
        log.taskId === standaloneTask.id &&
        log.objectiveId === "" &&
        log.focus > 0
    )
  ).toBe(true);
});

test("persists focus and break totals when finished during a break", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E break totals"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect
    .poll(async () => (await readSessionRuntime(page)).timeElapsed, {
      message:
        "persists focus and break totals when finished during a break: toBeGreaterThanOrEqual 1"
    })
    .toBeGreaterThanOrEqual(1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await finishSessionFromControl(page);
  const persisted = await readPersistedSession(page, sessionId);
  const focus = persisted.logs.reduce((sum, log) => sum + log.focus, 0);
  const breakTime = persisted.logs.reduce((sum, log) => sum + log.breakTime, 0);
  await dismissFinishedSession(page);

  expect(focus).toBeGreaterThan(0);
  expect(breakTime).toBeGreaterThan(0);
  expect(
    Math.abs(focus + breakTime - (persisted.session?.elapsed ?? 0))
  ).toBeLessThan(2);
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

test("keeps removed worked-item logs but excludes the item relation", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 2,
    prefix: "E2E removed log"
  });
  const first = fixture.standaloneTasks[0];
  const second = fixture.standaloneTasks[1];
  await addAdvancedFocusItems(page, [first.label, second.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 2);
  await selectFocusItem(page, second.label, second.id);
  await waitForSessionElapsed(page, 3);
  await setSessionEditMode(page, true);

  await page
    .getByTestId(`focus-session-remove:${first.id}`)
    .click({ timeout: 5_000 });
  expect(
    (await readSessionRuntime(page)).removedItems.find(
      (item) => item.id === first.id
    )?.blocks.length
  ).toBe(1);
  await setSessionEditMode(page, false);
  await waitForSessionElapsed(page, 4);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await finishSessionFromControl(page);
  const persisted = await readPersistedSession(page, sessionId);
  await dismissFinishedSession(page);

  expect(persisted.session?.items.map((item) => item.id)).toEqual([second.id]);
  const removedLog = persisted.logs.find((log) => log.taskId === first.id);
  const activeLog = persisted.logs.find((log) => log.taskId === second.id);
  expect(activeLog).toBeDefined();
  expect(activeLog?.focus).toBeGreaterThan(0);
  const removedLogRetained = Boolean(removedLog && removedLog.focus > 0);
  test.fail(
    !removedLogRetained,
    "Finished-session persistence currently omits the worked log for an item removed after its block was captured."
  );
  expect(removedLogRetained).toBe(true);
  await reopenPersistedSession(page, sessionId, [second.label]);
});

test("persists an unattributed fallback log for a session with no items", async ({
  page
}) => {
  await addAdvancedFocusItems(page, []);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await finishSessionFromControl(page);
  const persisted = await readPersistedSession(page, sessionId);
  await dismissFinishedSession(page);

  expect(persisted.session?.items).toEqual([]);
  expect(persisted.logs).toHaveLength(1);
  expect(persisted.logs[0]).toMatchObject({
    objectiveId: "",
    sessionId,
    taskId: ""
  });
  expect(persisted.logs[0].focus).toBeGreaterThan(0);
  await reopenPersistedSession(page, sessionId);
});

test("does not resurrect a completed session after Done and reload", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E no resurrect"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;
  await finishSessionFromControl(page);
  await dismissFinishedSession(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);

  const runtime = await readSessionRuntime(page);
  expect(runtime.isSessionRunning).toBe(false);
  expect(runtime.currentSessionId).toBeUndefined();
  expect((await readPersistedSession(page, sessionId)).session?.id).toBe(
    sessionId
  );
  await expect(
    page.locator('[aria-roledescription="zen mode"]').first()
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Focus$/i }).first()
  ).toBeVisible();
});

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  collectPageErrors,
  readSessionRuntime,
  reloadActiveSession,
  resetFocusSession,
  startAdvancedFocus,
  waitForSessionElapsed
} from "../focus-test-helpers";
import {
  dismissFinishedSession,
  finishSessionConcurrently,
  finishSessionFromControl,
  getCurrentFocusItemRow,
  getCurrentFocusSessionItems,
  getFocusItemRow,
  getSessionConfirmationDialog,
  readPersistedSession,
  readTaskRecord,
  reloadWithoutActiveSession,
  reopenPersistedSession,
  selectFocusItem,
  setEditMode
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

test("starts and finishes a session without focus items", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await addAdvancedFocusItems(page, []);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await expect(page.getByText("No focus items added.")).toBeVisible();
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^\d{2}:\d{2}(?::\d{2})?$/ }).last()
  ).toBeVisible();

  const running = await readSessionRuntime(page);
  expect(running.currentFocusItem).toBeUndefined();
  expect(running.isSessionRunning).toBe(true);

  await finishSessionFromControl(page);
  await dismissFinishedSession(page);

  const closed = await readSessionRuntime(page);
  expect(closed.isSessionRunning).toBe(false);
  expect(closed.state).toBe(0);
  await reopenPersistedSession(page, sessionId);
  expect(pageErrors).toEqual([]);
});

test("starts mixed focus items with exactly one current objective", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 1,
    prefix: "E2E mixed"
  });
  await addAdvancedFocusItems(page, [
    fixture.objective.label,
    fixture.standaloneTasks[0].label
  ]);

  await startAdvancedFocus(page);

  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeVisible();
  await expect(getCurrentFocusSessionItems(page)).toHaveCount(1);

  const state = await readSessionRuntime(page);
  expect(state.currentFocusItem?.id).toBe(fixture.objective.id);
  expect(state.items.map((item) => item.id)).toEqual([
    fixture.objective.id,
    fixture.standaloneTasks[0].id
  ]);

  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeVisible();
  await expect(
    getFocusItemRow(page, fixture.standaloneTasks[0].label)
  ).toBeVisible();
});

test("renders a nested task under its objective and starts the task", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E nested"
  });
  await addAdvancedFocusItems(page, [fixture.nestedTasks[0].label]);

  await startAdvancedFocus(page);

  await expect(
    page.getByText(fixture.objective.label, { exact: true }).first()
  ).toBeVisible();
  await expect(
    getCurrentFocusItemRow(page, fixture.nestedTasks[0].label)
  ).toBeVisible();

  const state = await readSessionRuntime(page);
  expect(state.currentFocusItem?.id).toBe(fixture.nestedTasks[0].id);
  expect(
    state.items.find((item) => item.id === fixture.objective.id)?.tasks
  ).toEqual([fixture.nestedTasks[0].id]);

  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, fixture.nestedTasks[0].label)
  ).toBeVisible();
  await expect(
    page.getByText(fixture.objective.label, { exact: true }).first()
  ).toBeVisible();
});

test("switches current objectives and freezes the previous block", async ({
  page
}) => {
  const first = await e2eSeed.focus.resources({ prefix: "E2E switch first" });
  const second = await e2eSeed.focus.resources({
    prefix: "E2E switch second"
  });
  await addAdvancedFocusItems(page, [
    first.objective.label,
    second.objective.label
  ]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);

  await selectFocusItem(page, second.objective.label, second.objective.id);
  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();

  const switched = await readSessionRuntime(page);
  expect(switched.currentFocusItem?.id).toBe(second.objective.id);
  expect(
    switched.items.find((item) => item.id === first.objective.id)?.blocks.length
  ).toBe(1);
  expect(
    switched.items.find((item) => item.id === first.objective.id)?.blocks[0].end
  ).toBeGreaterThan(
    switched.items.find((item) => item.id === first.objective.id)?.blocks[0]
      .start ?? 0
  );

  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();
  expect(
    (await readSessionRuntime(page)).items.find(
      (item) => item.id === first.objective.id
    )?.blocks
  ).toHaveLength(1);
});

test("stops the current item without stopping the session", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E stop item" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);

  await selectFocusItem(page, fixture.objective.label, null);

  const stopped = await expect
    .poll(async () => (await readSessionRuntime(page)).currentFocusItem, {
      message:
        "stops the current item without stopping the session: toBeUndefined"
    })
    .toBeUndefined()
    .then(() => true)
    .catch(() => false);
  const state = await readSessionRuntime(page);
  const stoppedWithoutDuplicateBlock =
    stopped &&
    state.items.find((item) => item.id === fixture.objective.id)?.blocks
      .length === 1;
  test.fail(
    !stoppedWithoutDuplicateBlock,
    "Clicking the active objective currently leaves it active or records duplicate blocks."
  );
  expect(stopped).toBe(true);
  expect(state.isSessionRunning).toBe(true);
  expect(
    state.items.find((item) => item.id === fixture.objective.id)?.blocks.length
  ).toBe(1);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeHidden();

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeHidden();
});

test("checking the current task stops it while the session continues", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E check task"
  });
  const task = fixture.nestedTasks[0];
  await addAdvancedFocusItems(page, [task.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);

  const row = getFocusItemRow(page, task.label);
  await row.locator("button").first().click({ timeout: 5_000 });

  await expect
    .poll(async () => (await readTaskRecord(page, task.id))?.isChecked, {
      message:
        "checking the current task stops it while the session continues: toBe true"
    })
    .toBe(true);
  const stopped = await expect
    .poll(async () => (await readSessionRuntime(page)).currentFocusItem, {
      message:
        "checking the current task stops it while the session continues: toBeUndefined"
    })
    .toBeUndefined()
    .then(() => true)
    .catch(() => false);
  test.fail(
    !stopped,
    "Checking the active task persists its checked state but currently leaves currentFocusItem active."
  );
  expect(stopped).toBe(true);
  const state = await readSessionRuntime(page);
  expect(state.isSessionRunning).toBe(true);
  await expect(getCurrentFocusItemRow(page, task.label)).toBeHidden();

  await reloadActiveSession(page);
  await expect(getCurrentFocusItemRow(page, task.label)).toBeHidden();
  expect((await readTaskRecord(page, task.id))?.isChecked).toBe(true);
});

test("moves through countup focus break and resume states", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E break" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "moves through countup focus break and resume states: toBe 3"
    })
    .toBe(3);

  await page
    .getByRole("button", { name: /^Resume$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();

  const resumed = await readSessionRuntime(page);
  expect(resumed.state).toBe(1);
  expect(resumed.intervals.map((interval) => interval.type)).toEqual([1, 0, 1]);

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  expect((await readSessionRuntime(page)).state).toBe(1);
});

test("selecting another item during a countup break resumes focus", async ({
  page
}) => {
  const first = await e2eSeed.focus.resources({ prefix: "E2E break first" });
  const second = await e2eSeed.focus.resources({ prefix: "E2E break second" });
  await addAdvancedFocusItems(page, [
    first.objective.label,
    second.objective.label
  ]);
  await startAdvancedFocus(page);

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await selectFocusItem(page, second.objective.label, second.objective.id);

  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();
  const state = await readSessionRuntime(page);
  expect(state.currentFocusItem?.id).toBe(second.objective.id);
  expect(state.state).toBe(1);

  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();
});

test("finishes once, persists the session, and resets after Done", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E finish" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId;
  expect(sessionId).toBeTruthy();

  await finishSessionFromControl(page);

  await expect
    .poll(
      async () => (await readPersistedSession(page, sessionId!)).session?.id,
      {
        message:
          "finishes once, persists the session, and resets after Done: toBe sessionId"
      }
    )
    .toBe(sessionId);
  await dismissFinishedSession(page);

  const reset = await readSessionRuntime(page);
  expect(reset.isSessionRunning).toBe(false);
  expect(reset.currentFocusItem).toBeUndefined();
  expect(reset.items).toEqual([]);
  await expect(
    page.getByRole("button", { name: /^Focus$/i }).first()
  ).toBeVisible({ timeout: 15_000 });
  await reopenPersistedSession(page, sessionId!, [fixture.objective.label]);
});

test("cancels and confirms finishing from the command bar", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E command finish"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await runCommand(page, "Finish the current session");
  const confirmation = getSessionConfirmationDialog(page);
  await expect(page.getByText("Finish focus session")).toBeVisible();
  await confirmation
    .getByRole("button", { name: /^Cancel\b/i })
    .click({ timeout: 5_000 });
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(true);

  await runCommand(page, "Finish the current session");
  await confirmation
    .getByRole("button", { name: /^Finish\b/i })
    .last()
    .click({ timeout: 5_000 });
  await expect(
    page.getByRole("button", { name: /^Done/i }).first()
  ).toBeVisible({ timeout: 20_000 });
  expect((await readPersistedSession(page, sessionId)).session?.id).toBe(
    sessionId
  );
  await dismissFinishedSession(page);
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

test("persists one session when finish is submitted twice", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E double finish"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await finishSessionConcurrently(page);
  const persisted = await readPersistedSession(page, sessionId);
  expect(persisted.session?.id).toBe(sessionId);
  expect(new Set(persisted.logs.map((log) => log.id)).size).toBe(
    persisted.logs.length
  );
  await dismissFinishedSession(page);
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

test("cancels and confirms abandoning without persisting a session", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E abandon" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  const sessionId = (await readSessionRuntime(page)).currentSessionId;
  expect(sessionId).toBeTruthy();

  await runCommand(page, "Abandon the current session");
  await expect(page.getByText("Abandon focus session")).toBeVisible();
  const confirmation = getSessionConfirmationDialog(page);
  await confirmation
    .getByRole("button", { name: /^Cancel\b/i })
    .click({ timeout: 5_000 });
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(true);

  await runCommand(page, "Abandon the current session");
  await confirmation
    .getByRole("button", { name: /^Abandon\b/i })
    .last()
    .click({ timeout: 5_000 });
  await expect
    .poll(async () => (await readSessionRuntime(page)).isSessionRunning, {
      message:
        "cancels and confirms abandoning without persisting a session: toBe false"
    })
    .toBe(false);

  const persisted = await readPersistedSession(page, sessionId!);
  expect(persisted.session).toBeUndefined();
  expect(persisted.logs).toEqual([]);
  await reloadWithoutActiveSession(page);
});

test("keyboard activation switches and stops a task", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 2,
    prefix: "E2E keyboard"
  });
  await addAdvancedFocusItems(
    page,
    fixture.standaloneTasks.map((task) => task.label)
  );
  await startAdvancedFocus(page);

  const secondRow = getFocusItemRow(page, fixture.standaloneTasks[1].label);
  await secondRow.focus();
  await page.keyboard.press("Enter");
  await expect(
    getCurrentFocusItemRow(page, fixture.standaloneTasks[1].label)
  ).toBeVisible();

  await secondRow.focus();
  await page.keyboard.press("Space");
  const stopped = await expect
    .poll(async () => (await readSessionRuntime(page)).currentFocusItem, {
      message: "keyboard activation switches and stops a task: toBeUndefined"
    })
    .toBeUndefined()
    .then(() => true)
    .catch(() => false);
  test.fail(
    !stopped,
    "Space activation on an active task currently leaves currentFocusItem active."
  );
  expect(stopped).toBe(true);
  await expect(
    getCurrentFocusItemRow(page, fixture.standaloneTasks[1].label)
  ).toBeHidden();
  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, fixture.standaloneTasks[1].label)
  ).toBeHidden();
});

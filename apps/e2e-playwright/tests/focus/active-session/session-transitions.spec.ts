import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  readToastNotificationContent
} from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  collectPageErrors,
  readSessionRuntime,
  reloadActiveSession,
  resetFocusSession,
  startAdvancedFocus
} from "../focus-test-helpers";
import {
  configureSessionComposition,
  dismissFinishedSession,
  getCurrentFocusItemRow,
  getPredefinedIntervalNotifier,
  readPersistedSession,
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
  await page.clock.install({ time: new Date("2026-07-16T10:00:00.000Z") });
});

test.afterEach(async ({ page }) => {
  await setEditMode(page, false).catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

test("auto-finishes a countdown and caps persistence at the planned end", async ({
  page
}) => {
  const pageErrors = collectPageErrors(page);
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E auto countdown"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 0,
    breakType: "Reminder",
    focusDuration: 4,
    numberOfBreaks: 0,
    totalDuration: 4,
    type: "Total duration"
  });
  await startAdvancedFocus(page);
  const started = await readSessionRuntime(page);
  const plannedEnd = (started.start ?? 0) + started.plannedDuration * 1000;

  await page.clock.fastForward(10_000);

  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "auto-finishes a countdown and caps persistence at the planned...: toBe 8"
    })
    .toBe(8);
  await expect(
    page.getByRole("button", { name: /^Done/i }).first()
  ).toBeVisible();
  await dismissFinishedSession(page);

  await expect
    .poll(
      async () =>
        (await readPersistedSession(page, started.currentSessionId!)).session
          ?.id,
      {
        message:
          "auto-finishes a countdown and caps persistence at the planned...: toBe started.currentSessionId"
      }
    )
    .toBe(started.currentSessionId);
  const persisted = await readPersistedSession(page, started.currentSessionId!);
  const persistedEnd = persisted.session?.endUnix ?? 0;
  const persistedEndMs =
    persistedEnd < 1_000_000_000_000 ? persistedEnd * 1_000 : persistedEnd;
  expect(Math.abs(persistedEndMs - plannedEnd)).toBeLessThan(1_000);
  await reopenPersistedSession(page, started.currentSessionId!, [
    fixture.objective.label
  ]);
  expect(pageErrors).toEqual([]);
});

test("transitions predefined focus break focus and shows notifier overlays", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E predefined"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 2,
    breakReminder: 0,
    breakType: "Predefined",
    focusDuration: 4,
    numberOfBreaks: 1,
    totalDuration: 6,
    type: "Total duration"
  });
  await startAdvancedFocus(page);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await page.clock.runFor(2_100);
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "transitions predefined focus break focus and shows notifier o...: toBe 3"
    })
    .toBe(3);
  await expect(page.getByText("BREAK STARTED", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(getPredefinedIntervalNotifier(page)).toBeHidden();

  await page.clock.runFor(2_100);
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "transitions predefined focus break focus and shows notifier o...: toBe 1"
    })
    .toBe(1);
  await expect(page.getByText("FOCUS STARTED", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(getPredefinedIntervalNotifier(page)).toBeHidden();

  await page.clock.runFor(2_100);
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "transitions predefined focus break focus and shows notifier o...: toBe 8"
    })
    .toBe(8);
  await dismissFinishedSession(page);
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

test("continues working when the break reminder is dismissed", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E reminder continue"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 2,
    breakType: "Reminder",
    focusDuration: 0,
    numberOfBreaks: 0,
    totalDuration: 0,
    type: "Countup"
  });
  await startAdvancedFocus(page);

  await page.clock.runFor(4_000);
  const reminder = page.getByText("Break Reminder", { exact: true });
  const reminderVisible = await reminder
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  test.fail(
    !reminderVisible,
    "Configured break reminders currently do not publish the reminder modal."
  );
  expect(reminderVisible).toBe(true);
  await page
    .getByRole("button", { name: /^Continue working$/i })
    .click({ timeout: 5_000 });

  const state = await readSessionRuntime(page);
  expect(state.state).toBe(1);
  expect(state.isSessionRunning).toBe(true);
  await expect(page.getByText("Break Reminder", { exact: true })).toBeHidden();

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeVisible();
});

test("starts a break from the reminder action", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E reminder break"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 2,
    breakType: "Reminder",
    focusDuration: 0,
    numberOfBreaks: 0,
    totalDuration: 0,
    type: "Countup"
  });
  await startAdvancedFocus(page);

  await page.clock.runFor(4_000);
  const reminder = page.getByText("Break Reminder", { exact: true });
  const reminderVisible = await reminder
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  test.fail(
    !reminderVisible,
    "Configured break reminders currently do not publish the reminder modal."
  );
  expect(reminderVisible).toBe(true);
  await page
    .getByRole("button", { name: /^Take break$/i })
    .click({ timeout: 5_000 });

  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "starts a break from the reminder action: toBe 3"
    })
    .toBe(3);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  await expect(page.getByText("Break Reminder", { exact: true })).toBeHidden();

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
});

test("blocks objective switching during a predefined break", async ({
  page
}) => {
  const first = await e2eSeed.focus.resources({
    prefix: "E2E predefined first"
  });
  const second = await e2eSeed.focus.resources({
    prefix: "E2E predefined second"
  });
  await addAdvancedFocusItems(page, [
    first.objective.label,
    second.objective.label
  ]);
  await configureSessionComposition(page, {
    breakDuration: 2,
    breakReminder: 0,
    breakType: "Predefined",
    focusDuration: 4,
    numberOfBreaks: 1,
    totalDuration: 6,
    type: "Total duration"
  });
  await startAdvancedFocus(page);
  await page.clock.runFor(2_500);
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "blocks objective switching during a predefined break: toBe 3"
    })
    .toBe(3);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(getPredefinedIntervalNotifier(page)).toBeHidden();

  await selectFocusItem(page, second.objective.label);

  await readToastNotificationContent(page, {
    expectedContent: "Cannot start working on an item while break is running",
    timeout: 10_000
  });
  expect((await readSessionRuntime(page)).currentFocusItem?.id).toBe(
    first.objective.id
  );

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  expect((await readSessionRuntime(page)).currentFocusItem?.id).toBe(
    first.objective.id
  );
});

test("preserves countdown duration through a manual break and resume", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E countdown break"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 0,
    breakType: "Reminder",
    focusDuration: 10,
    numberOfBreaks: 0,
    totalDuration: 10,
    type: "Total duration"
  });
  await startAdvancedFocus(page);
  await page.clock.runFor(2_000);
  const before = await readSessionRuntime(page);

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .dispatchEvent("click");
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "preserves countdown duration through a manual break and resume: toBe 3"
    })
    .toBe(3);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  await page.clock.runFor(2_000);
  await page
    .getByRole("button", { name: /^Resume$/i })
    .first()
    .dispatchEvent("click");
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "preserves countdown duration through a manual break and resume: toBe 1"
    })
    .toBe(1);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  await expect
    .poll(async () => (await readSessionRuntime(page)).plannedDuration, {
      message:
        "preserves countdown duration through a manual break and resume: toBe before.plannedDuration"
    })
    .toBe(before.plannedDuration);
  await expect
    .poll(
      async () =>
        (await readSessionRuntime(page)).intervals.map(
          (interval) => interval.type
        ),
      {
        message:
          "preserves countdown duration through a manual break and resume: toEqual [1, 0, 1]"
      }
    )
    .toEqual([1, 0, 1]);

  const resumed = await readSessionRuntime(page);
  expect(resumed.plannedDuration).toBe(before.plannedDuration);
  expect(resumed.end).toBe(before.end);

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT FOCUS").first()).toBeVisible();
  expect((await readSessionRuntime(page)).plannedDuration).toBe(
    before.plannedDuration
  );
});

test("extends target-focus duration by the time spent on a manual break", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E target break"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 0,
    breakType: "Reminder",
    focusDuration: 6,
    numberOfBreaks: 0,
    totalDuration: 6,
    type: "Focus target"
  });
  await startAdvancedFocus(page);
  await page.clock.runFor(2_000);
  const before = await readSessionRuntime(page);

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .dispatchEvent("click");
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "extends target-focus duration by the time spent on a manual b...: toBe 3"
    })
    .toBe(3);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  await page.clock.runFor(2_000);

  await expect
    .poll(async () => (await readSessionRuntime(page)).plannedDuration, {
      message:
        "extends target-focus duration by the time spent on a manual b...: toBeGreaterThan before.plannedDuration"
    })
    .toBeGreaterThan(before.plannedDuration);
  const duringBreak = await readSessionRuntime(page);
  expect(duringBreak.end).toBeUndefined();
  expect(duringBreak.state).toBe(3);

  await reloadActiveSession(page);
  await expect(page.getByText("CURRENT BREAK").first()).toBeVisible();
  expect((await readSessionRuntime(page)).plannedDuration).toBeGreaterThan(
    before.plannedDuration
  );
});

test("restores a prefinished countdown after reload and persists once", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E prefinished reload"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await configureSessionComposition(page, {
    breakDuration: 0,
    breakReminder: 0,
    breakType: "Reminder",
    focusDuration: 3,
    numberOfBreaks: 0,
    totalDuration: 3,
    type: "Total duration"
  });
  await startAdvancedFocus(page);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;
  await page.clock.runFor(4_000);
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message:
        "restores a prefinished countdown after reload and persists once: toBe 8"
    })
    .toBe(8);
  await expect(
    page.getByRole("button", { name: /^Done/i }).first()
  ).toBeVisible({ timeout: 15_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await expect(
    page.getByRole("button", { name: /^Done/i }).first()
  ).toBeVisible({ timeout: 15_000 });
  await dismissFinishedSession(page);

  const persisted = await readPersistedSession(page, sessionId);
  expect(persisted.session?.id).toBe(sessionId);
  expect(new Set(persisted.logs.map((log) => log.id)).size).toBe(
    persisted.logs.length
  );
  await expect(
    getCurrentFocusItemRow(page, fixture.objective.label)
  ).toBeHidden();
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

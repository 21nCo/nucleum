import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  navigateToSurface,
  runCommand
} from "../utils/helpers";
import { expectNodeVisibleInLibrary } from "../memory/memory-test-helpers";

/**
 * Resolves the local calendar date key used by month-view tile test hooks.
 */
function resolveDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Opens the Nucleum calendar in the month view and waits for the classic month grid.
 */
async function openCalendarMonthView(page: Page) {
  await ensureInAppOnHome(page);
  await navigateToSurface(page, "calendar.view.month");

  await expect(getTileForDate(page, resolveDateKey())).toBeVisible({
    timeout: 20_000
  });
}

/**
 * Returns a month-view day tile for the local date key.
 */
function getTileForDate(page: Page, dateKey: string) {
  return page
    .locator(
      `[data-testid="calendar-month-day-tile"][data-date-key="${dateKey}"]`
    )
    .first();
}

/**
 * Resolves a stable mid-month date for month navigation checks.
 */
function resolveStableMonthDate(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 15);
}

/**
 * Resolves the date reached by navigating relative months from a base date.
 */
function resolveRelativeMonthDate(baseDate: Date, monthDelta: number) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + monthDelta,
    baseDate.getDate()
  );
}

/**
 * Navigates the classic calendar header by one month.
 */
async function navigateMonth(page: Page, direction: "previous" | "next") {
  const button =
    direction === "previous"
      ? page.getByRole("button", { name: "Previous calendar period" })
      : page.getByRole("button", { name: "Next calendar period" });
  await button.click({ timeout: 5_000 });
}

/**
 * Reads the task total rendered in a calendar tile.
 */
async function readTaskTotal(tile: Locator) {
  const text = (await tile.textContent()) ?? "";
  const match = text.match(/\d+\s*\/\s*(\d+)\s*tasks?/i);
  return match ? Number(match[1]) : 0;
}

/**
 * Reads the focus amount rendered in a calendar tile as approximate seconds.
 */
async function readFocusSeconds(tile: Locator) {
  const row = tile.getByTestId("calendar-tile-indicator-session");
  if (!(await row.isVisible().catch(() => false))) return 0;
  const text = (await row.textContent()) ?? "";
  const match = text.match(/F:\s*([0-9.]+)\s*([a-z]*)/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "";
  if (!Number.isFinite(amount)) return 0;
  if (unit.startsWith("h")) return amount * 3600;
  if (unit.startsWith("m")) return amount * 60;
  return amount;
}

/**
 * Reads the node count rendered in a calendar tile.
 */
async function readNodeCount(tile: Locator) {
  const row = tile.getByTestId("calendar-tile-indicator-node");
  if (!(await row.isVisible().catch(() => false))) return 0;
  const text = (await row.textContent()) ?? "";
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/**
 * Creates a task for the selected calendar day from the timeline panel.
 */
async function createTaskFromCalendarPanel(page: Page, label: string) {
  const timelineButton = page
    .getByRole("button", { name: /^Timeline$/i })
    .first();
  if (await timelineButton.isVisible().catch(() => false)) {
    await timelineButton.click({ timeout: 5_000 }).catch(() => null);
  }

  const tasksButton = page
    .getByRole("tab", { name: /^Tasks$/i })
    .or(page.getByRole("button", { name: /^Tasks$/i }))
    .first();
  if (await tasksButton.isVisible().catch(() => false)) {
    await tasksButton.click({ timeout: 5_000 }).catch(() => null);
  }

  await page.getByTestId("calendar-timeline-create-button").click({
    timeout: 10_000
  });
  const input = page.getByTestId("task-name-input");
  await input.waitFor({ state: "visible", timeout: 15_000 });
  await input.fill(label);
  await page.keyboard.press("Enter");
  await input.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await expect(
    page.getByRole("button", { name: label, exact: true }).first()
  ).toBeVisible({
    timeout: 15_000
  });
}

/** Opens a calendar day and verifies a task in its owning Tasks panel. */
async function expectCalendarTaskVisible(
  page: Page,
  dateKey: string,
  label: string
) {
  await getTileForDate(page, dateKey).click({ timeout: 5_000 });
  const tasksTab = page
    .getByRole("tab", { name: /^Tasks$/i })
    .or(page.getByRole("button", { name: /^Tasks$/i }))
    .first();
  if (await tasksTab.isVisible().catch(() => false)) {
    await tasksTab.click({ timeout: 5_000 });
  }
  await expect(
    page.getByRole("button", { name: label, exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
}

let e2eSeed: E2ESeed;

/**
 * Creates a ten-minute focus session through the manual time entry flow.
 */
async function createManualFocusLog(page: Page, objectiveLabel: string) {
  await runCommand(page, "Manual time entry");
  await expect(page.getByText("Manual time entry").first()).toBeVisible({
    timeout: 10_000
  });

  const objectiveInput = page.getByPlaceholder(
    "Start typing to select objective"
  );
  await objectiveInput.waitFor({ state: "visible", timeout: 10_000 });
  await objectiveInput.fill(objectiveLabel);
  await expect(
    page.getByText(objectiveLabel, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Enter");

  const quickDurationButton = page
    .getByRole("button", { name: /last\s+10\s*min/i })
    .first();
  if (await quickDurationButton.isVisible().catch(() => false)) {
    await quickDurationButton.click({ timeout: 2_000 }).catch(() => null);
  }

  await page
    .locator("button")
    .filter({ hasText: /Save entries/i })
    .click({ timeout: 5_000 });
  await runCommand(page, "See Logs");
  await expect(
    page.getByText(objectiveLabel, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Creates a root node through Capture.
 */
async function createNodeViaCapture(page: Page, body: string) {
  await runCommand(page, "Capture");
  const editor = page.getByTestId("capture-editor");
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click();
  await page.keyboard.type(body, { delay: 20 });
  await expect(editor).toContainText(body);
  await page.getByTestId("capture-save-button").first().click({
    timeout: 10_000
  });
  const recordSurface = page.getByTestId("resource-record-surface");
  await expect(recordSurface).toBeVisible({ timeout: 20_000 });
  await expect(
    recordSurface.getByText(body, { exact: true }).first()
  ).toBeVisible({ timeout: 20_000 });
}

/**
 * Finds a visible month tile that does not currently show a notes indicator.
 */
async function findTileWithoutNotes(page: Page, monthKey: string) {
  const tiles = page.getByTestId("calendar-month-day-tile");
  const count = await tiles.count();
  for (let index = 0; index < count; index += 1) {
    const tile = tiles.nth(index);
    if (!(await tile.isVisible().catch(() => false))) continue;
    const dateKey = await tile.getAttribute("data-date-key");
    if (!dateKey?.startsWith(monthKey)) continue;
    const notes = tile.getByTestId("calendar-tile-indicator-notes");
    if (!(await notes.isVisible().catch(() => false))) return tile;
  }
  throw new Error(
    `No visible ${monthKey} calendar tile without an existing notes indicator`
  );
}

test.describe("nucleum calendar tile indicators", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });
  });

  test("task indicator refreshes when a task is created for the selected day", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openCalendarMonthView(page);

    const tile = getTileForDate(page, resolveDateKey());
    const before = await readTaskTotal(tile);
    await tile.click({ timeout: 5_000 });

    const taskLabel = `E2E calendar task indicator ${Date.now()}`;
    await createTaskFromCalendarPanel(page, taskLabel);

    await expect
      .poll(() => readTaskTotal(tile), {
        message:
          "task indicator refreshes when a task is created for the selec...: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await openCalendarMonthView(page);
    await expectCalendarTaskVisible(page, resolveDateKey(), taskLabel);
    await expect
      .poll(() => readTaskTotal(getTileForDate(page, resolveDateKey())), {
        message:
          "task indicator refreshes when a task is created for the selec...: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);
  });

  test("task indicator refreshes after navigating to another month", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openCalendarMonthView(page);

    const baseDate = resolveStableMonthDate();
    await getTileForDate(page, resolveDateKey(baseDate)).click({
      timeout: 5_000
    });

    await navigateMonth(page, "previous");

    const targetDate = resolveRelativeMonthDate(baseDate, -1);
    const targetTile = getTileForDate(page, resolveDateKey(targetDate));
    await expect(targetTile).toBeVisible({ timeout: 20_000 });
    const before = await readTaskTotal(targetTile);

    const taskLabel = `E2E calendar navigated-month task indicator ${Date.now()}`;
    await createTaskFromCalendarPanel(page, taskLabel);

    await expect
      .poll(() => readTaskTotal(targetTile), {
        message:
          "task indicator refreshes after navigating to another month: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await openCalendarMonthView(page);
    await navigateMonth(page, "previous");
    await expectCalendarTaskVisible(
      page,
      resolveDateKey(targetDate),
      taskLabel
    );
    await expect
      .poll(
        () => readTaskTotal(getTileForDate(page, resolveDateKey(targetDate))),
        {
          message:
            "task indicator refreshes after navigating to another month: toBeGreaterThan before",
          timeout: 20_000
        }
      )
      .toBeGreaterThan(before);
  });

  test("focus indicator refreshes when a manual focus log is saved", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await openCalendarMonthView(page);

    const tile = getTileForDate(page, resolveDateKey());
    const before = await readFocusSeconds(tile);
    const objectiveLabel = `E2E calendar focus indicator ${Date.now()}`;

    await e2eSeed.focus.objective({ label: objectiveLabel });
    await createManualFocusLog(page, objectiveLabel);
    await openCalendarMonthView(page);

    const refreshedTile = getTileForDate(page, resolveDateKey());
    await expect
      .poll(() => readFocusSeconds(refreshedTile), {
        message:
          "focus indicator refreshes when a manual focus log is saved: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await runCommand(page, "See Logs");
    await expect(
      page.getByText(objectiveLabel, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });
    await openCalendarMonthView(page);
    await expect
      .poll(() => readFocusSeconds(getTileForDate(page, resolveDateKey())), {
        message:
          "focus indicator refreshes when a manual focus log is saved: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);
  });

  test("node indicator refreshes when a capture is saved", async ({ page }) => {
    test.setTimeout(90_000);
    await openCalendarMonthView(page);

    const tile = getTileForDate(page, resolveDateKey());
    const before = await readNodeCount(tile);

    const nodeBody = `E2E calendar node indicator ${Date.now()}`;
    await createNodeViaCapture(page, nodeBody);
    await openCalendarMonthView(page);

    const refreshedTile = getTileForDate(page, resolveDateKey());
    await expect
      .poll(() => readNodeCount(refreshedTile), {
        message:
          "node indicator refreshes when a capture is saved: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await expectNodeVisibleInLibrary(page, nodeBody);
    await openCalendarMonthView(page);
    await expect
      .poll(() => readNodeCount(getTileForDate(page, resolveDateKey())), {
        message:
          "node indicator refreshes when a capture is saved: toBeGreaterThan before",
        timeout: 20_000
      })
      .toBeGreaterThan(before);
  });

  test("notes indicator refreshes when day notes are edited", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openCalendarMonthView(page);

    const tile = await findTileWithoutNotes(page, resolveDateKey().slice(0, 7));
    const dateKey = await tile.getAttribute("data-date-key");
    expect(dateKey).not.toBeNull();
    await tile.click({ timeout: 5_000 });

    const notesButton = page
      .getByRole("button", { name: /^Notes$/i })
      .or(page.getByRole("tab", { name: /^Notes$/i }))
      .first();
    await notesButton.click({ timeout: 10_000 });

    const editor = page
      .getByPlaceholder(/Start typing or use \/ to browse/i)
      .or(page.getByRole("textbox", { name: /Markdown editor/i }))
      .first();
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click();
    const noteText = `E2E calendar notes indicator ${Date.now()}`;
    await page.keyboard.type(noteText, {
      delay: 20
    });
    await expect(editor).toContainText(noteText, { timeout: 15_000 });

    await expect(tile.getByTestId("calendar-tile-indicator-notes")).toBeVisible(
      {
        timeout: 20_000
      }
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await openCalendarMonthView(page);
    const restoredTile = getTileForDate(page, dateKey!);
    await restoredTile.click({ timeout: 5_000 });
    await page
      .getByRole("button", { name: /^Notes$/i })
      .or(page.getByRole("tab", { name: /^Notes$/i }))
      .first()
      .click({ timeout: 10_000 });
    const restoredEditor = page
      .getByPlaceholder(/Start typing or use \/ to browse/i)
      .or(page.getByRole("textbox", { name: /Markdown editor/i }))
      .first();
    await expect(restoredEditor).toContainText(noteText, { timeout: 15_000 });
    await expect(
      restoredTile.getByTestId("calendar-tile-indicator-notes")
    ).toBeVisible({ timeout: 20_000 });
  });
});

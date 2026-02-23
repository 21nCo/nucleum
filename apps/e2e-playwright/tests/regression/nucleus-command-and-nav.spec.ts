import { test, expect } from "@playwright/test";
import { nucleusProductConfig } from "../../config/nucleus-product.config";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const baseURL = runtimeEnv?.APP_BASE_URL ?? "http://127.0.0.1:4173";

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("regression – Nucleus command bar", () => {
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

  /**
   * Ensure we're in the app (dismiss signup if needed) and on the Nucleus home (calendar),
   * with app nav visible. Same flow as navigation.spec: continue offline → calendar → nav ready.
   */
  async function ensureInAppOnHome(page: import("@playwright/test").Page) {
    await page.goto(baseURL);
    await page.waitForLoadState("domcontentloaded");

    const clickContinueOfflineIfVisible = async () => {
      const continueOfflineMain = page
        .getByRole("button", { name: /Continue (using )?offline/i })
        .filter({ hasText: /Single device|free forever|No signup/i })
        .first();
      const continueOfflineAny = page.getByRole("button", {
        name: /Continue (using )?offline/i
      }).first();
      const pathname = new URL(page.url()).pathname;
      const waitMs =
        pathname === "/signup" || pathname === "/account/login" ? 10_000 : 3_000;
      let target = continueOfflineMain;
      try {
        await continueOfflineMain.waitFor({ state: "visible", timeout: waitMs });
      } catch {
        try {
          await continueOfflineAny.waitFor({ state: "visible", timeout: 2_000 });
          target = continueOfflineAny;
        } catch {
          return false;
        }
      }
      const beforePath = new URL(page.url()).pathname;
      await target.click({ timeout: 5_000, force: true }).catch(() => null);
      await page.waitForLoadState("domcontentloaded").catch(() => null);
      const progressed = await page
        .waitForURL(
          (u) => {
            const p = new URL(u).pathname;
            return p !== "/signup" && p !== "/account/login";
          },
          { timeout: 8_000 }
        )
        .then(() => true)
        .catch(() => false);
      return progressed || new URL(page.url()).pathname !== beforePath;
    };

    for (let i = 0; i < 4; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
    }
    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    const homeUrl = new URL(nucleusProductConfig.homePath, baseURL).toString();
    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
    await page
      .waitForURL(
        (u) => {
          const p = new URL(u).pathname;
          return p === "/calendar" || p.startsWith("/calendar/");
        },
        { timeout: 10_000 }
      )
      .catch(() => null);

    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    const navMarkers = [
      page.getByRole("button", { name: /^Overview$/i }).first(),
      page.getByRole("button", { name: /^Calendar$/i }).first(),
      page.getByRole("button", { name: "Today" }).first()
    ];
    await expect
      .poll(
        async () => {
          for (const marker of navMarkers) {
            if (await marker.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: 25_000 }
      )
      .toBe(true);
  }

  /**
   * Open command bar, type the command label, press Enter.
   */
  async function runCommand(
    page: import("@playwright/test").Page,
    commandLabel: string
  ) {
    const cmdButton = page.getByRole("button", { name: /command bar/i });
    await cmdButton.click({ timeout: 5_000 });
    const cmdInput = page.getByPlaceholder(/search for a command/i);
    await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
    await cmdInput.fill(commandLabel);
    await page.keyboard.press("Enter");
  }

  /**
   * Run "Quick focus" command. Typing "Quick focus" matches two commands; the first is
   * "Pin a goal to quick focus". So we press ArrowDown once to select "Quick focus", then Enter.
   */
  async function runQuickFocusCommand(page: import("@playwright/test").Page) {
    const cmdButton = page.getByRole("button", { name: /command bar/i });
    await cmdButton.click({ timeout: 5_000 });
    const cmdInput = page.getByPlaceholder(/search for a command/i);
    await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
    await cmdInput.fill("Quick focus");
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
  }

  test("open command bar and create a goal, then start focus and verify in timeline", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    // Use a unique name so we don't conflict with existing goals and always target the one we create.
    const goalName = `E2E test goal ${Date.now()}`;

    await runCommand(page, "Create a new goal");

    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");

    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);

    // Close goal panel if open so the main app is usable.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    // Start focus: run "Quick focus" (ArrowDown once so we don't run "Pin a goal to quick focus").
    await runQuickFocusCommand(page);
    const quickFocusSearch = page.getByPlaceholder("Select a goal to focus");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 8_000 });
    await quickFocusSearch.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");

    await page.locator("#cp").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);

    // Confirm focus session started (timer appears in nav when session is running).
    const focusTimerButton = page.getByRole("button", { name: /^\d{1,2}:\d{2}$/ });
    await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });

    // Let the focus session run for 4 seconds, then stop the session using command bar.
    await page.waitForTimeout(4_000);

    // Use command bar to finish the session
    await runCommand(page, "Finish the current session");
    // Confirm the finish action in the confirmation dialog
    await page.getByRole("button", { name: "Finish Win + Enter", exact: true }).click({ timeout: 5_000 });

    // Click "Done" in the session finished modal to close it
    await page.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });

    // Wait for the session to actually end: focus timer in nav disappears so the session is persisted.
    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForTimeout(1_500);

    // Go to the timeline page (configured per product) and ensure today's timeline is visible.
    await page.getByRole("button", { name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i") }).click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => new RegExp(`^\\/${nucleusProductConfig.homePath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Today$/i }).first().click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(2_000);

    // Close the goal panel so the calendar timeline is in view (panel can cover the timeline).
    await page.getByRole("button", { name: /^Close$/i }).first().click({ timeout: 3_000 }).catch(() => null);
    await page.waitForTimeout(500);

    // Timeline shows focus entries as "startTime - endTime" (or a single time when compact). Wait for a focus entry.
    const timelineFocusEntry = page.locator("button").filter({ hasText: /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/ }).first();
    await expect(timelineFocusEntry).toBeVisible({ timeout: 15_000 });

    // Goal name is shown in the timeline entry.
    await expect(page.getByText(goalName, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("create goal via UI (Library), start and finish focus via UI (Quick Focus panel), then verify in timeline", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E test goal ${Date.now()}`;

    // ── Step 1: Create a goal via the Library page UI ──────────────────────────
    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.getByRole("button", { name: /^Goals$/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const newGoalBtn = page.getByRole("button", { name: /New goal/i }).first();
    const createNewGoalBtn = page.getByRole("button", { name: /Create new goal/i }).first();
    const clicked = await newGoalBtn.click({ timeout: 3_000 }).then(() => true).catch(() => false);
    if (!clicked) {
      await createNewGoalBtn.click({ timeout: 5_000 });
    }

    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: /^Close$/i }).first().click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(500);

    // ── Step 2: Open the Quick Focus panel (Focus nav). From Library, click Calendar first so ──
    // the app is on a neutral page; then Focus nav will show the Focus page with the search bar.
    await page.getByRole("button", { name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i") }).click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^Focus$/i }).click({ timeout: 5_000 });
    const quickFocusSearch = page.getByPlaceholder("Search a goal to quick focus");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 12_000 });
    const currentQuery = await quickFocusSearch.inputValue();
    if (!currentQuery.includes(goalName)) {
      await quickFocusSearch.fill(goalName);
      await page.waitForTimeout(800);
    }

    // ── Step 3: Start focus by clicking the goal thumbnail in the Quick Focus panel ──
    const quickFocusPanel = page.locator("div").filter({ has: quickFocusSearch });
    const goalThumbnail = quickFocusPanel.locator("button").filter({ hasText: goalName }).first();
    await goalThumbnail.waitFor({ state: "visible", timeout: 15_000 });
    await goalThumbnail.click({ timeout: 5_000 });

    const focusTimerButton = page.getByRole("button", { name: /^\d{1,2}:\d{2}$/ });
    await focusTimerButton.waitFor({ state: "visible", timeout: 8_000 });

    // Let the focus session run for 4 seconds before stopping.
    await page.waitForTimeout(4_000);

    // ── Step 4: Finish the session (active thumbnail in Quick Focus panel) ──
    const activeThumbnail = quickFocusPanel.locator("button").filter({ hasText: goalName }).first();
    await activeThumbnail.waitFor({ state: "visible", timeout: 10_000 });
    await activeThumbnail.click({ timeout: 5_000 });

    await page.waitForTimeout(1_000);
    const timerStillVisible = await focusTimerButton.isVisible().catch(() => false);
    if (timerStillVisible) {
      await focusTimerButton.click({ timeout: 5_000 });
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /^Finish$/i }).click({ timeout: 5_000 });
    }
    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForTimeout(1_000);

    // ── Step 5: Go to timeline and verify the session appears ───────────────────
    await page.getByRole("button", { name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i") }).click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => new RegExp(`^\\/${nucleusProductConfig.homePath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Today$/i }).first().click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(2_000);

    await page.getByRole("button", { name: /^Close$/i }).first().click({ timeout: 3_000 }).catch(() => null);
    await page.waitForTimeout(500);

    const timelineFocusEntry = page.locator("button").filter({ hasText: /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/ }).first();
    await expect(timelineFocusEntry).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(goalName, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("create a new task via command bar, then verify in Library", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task ${Date.now()}`;

    await runCommand(page, "Create a new task");
    const taskNameInput = page.getByPlaceholder("Enter task name");
    await taskNameInput.waitFor({ state: "visible", timeout: 10_000 });
    await taskNameInput.fill(taskName);
    await page.keyboard.press("Enter");

    await taskNameInput.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    // Library sidebar shows "Tasks" or "Tasks N" (count); match by prefix
    await page.getByRole("button", { name: /^Tasks(\s|$)/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    // Task row is a button with the task name as accessible name
    await expect(page.getByRole("button", { name: taskName })).toBeVisible({ timeout: 10_000 });
  });

  test("create a new task via UI (Library → Tasks → plus icon → name → Enter), then verify in list", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task ${Date.now()}`;

    // ── Navigate to Library → Tasks only (no command bar)
    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.getByRole("button", { name: /^Tasks(\s|$)/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    // ── Open create form via the plus icon in the task list header (top right), not sidebar "New task" or empty-state "Create task N"
    const taskListToolbar = page.locator("div").filter({
      has: page.getByRole("button", { name: /By month/i })
    }).filter({
      hasNot: page.getByText("No tasks found")
    }).first();
    const plusIconInHeader = taskListToolbar.getByRole("button").last();
    await plusIconInHeader.click({ timeout: 8_000 });

    const taskNameInput = page.getByPlaceholder("Enter task name");
    await taskNameInput.waitFor({ state: "visible", timeout: 10_000 });
    await taskNameInput.fill(taskName);

    // Submit via Enter (inline wizard on:enter; save icon is icon-only with no accessible name)
    await taskNameInput.press("Enter");

    await page.waitForTimeout(1_000);
    await expect(page.getByRole("button", { name: taskName })).toBeVisible({ timeout: 10_000 });
  });

  test("open Logs via command bar (See Logs), then assert Logs view visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "See Logs");

    // Logs sheet opens for "today" by default (no calendar date passed). You see sessions only for that day — use the date picker in Logs to switch days if your focus was on another date.
    await expect(page.getByText("Logs").first()).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Shared: fill one manual log entry (goal + duration) and save. Assumes Manual time entry modal is open.
   * Uses a unique goal name so we can assert it in Logs.
   */
  async function fillManualLogEntryAndSave(
    page: import("@playwright/test").Page,
    goalName: string
  ) {
    const goalInput = page.getByPlaceholder("Start typing to select goal");
    await goalInput.waitFor({ state: "visible", timeout: 10_000 });
    await goalInput.fill(goalName);
    await page.waitForTimeout(1_000);
    await page.keyboard.press("Enter");

    // Quick duration is often pre-selected (e.g. 10 min). If not, click a quick duration button.
    const quickDurationBtn = page.getByRole("button", { name: /last\s+10\s*min/i }).first();
    const hasQuick = await quickDurationBtn.isVisible().catch(() => false);
    if (hasQuick) await quickDurationBtn.click({ timeout: 2_000 }).catch(() => null);
    await page.waitForTimeout(300);

    // Target the primary action <button> only; the modal overlay div has role="button" and would match /Save entries/i too (strict mode).
    await page.locator("button").filter({ hasText: /Save entries/i }).click({ timeout: 5_000 });
  }

  test("manual time entry via command bar (Manual time entry → goal + duration → save), then assert in Logs", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual entry ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runCommand(page, "Manual time entry");
    await expect(page.getByText("Manual time entry").first()).toBeVisible({ timeout: 10_000 });
    await fillManualLogEntryAndSave(page, goalName);

    await page.waitForTimeout(1_500);
    await runCommand(page, "See Logs");
    await expect(page.getByText("Logs").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(goalName, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("manual time entry via UI (Focus → Add manual log → goal + duration → save), then assert in Logs", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual UI ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runCommand(page, "Focus");
    await page.getByRole("button", { name: /Add manual log/i }).click({ timeout: 10_000 });
    await expect(page.getByText("Manual time entry").first()).toBeVisible({ timeout: 10_000 });
    await fillManualLogEntryAndSave(page, goalName);

    await page.waitForTimeout(1_500);
    await runCommand(page, "See Logs");
    await expect(page.getByText("Logs").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(goalName, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("open Logs via UI (Calendar → Activity → Focus), then assert Logs view visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page
      .getByRole("button", { name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i") })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => new RegExp(`^\\/${nucleusProductConfig.homePath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_000);

    // 1) Click the Focus button (circle icon) in the top bar first — do not click Columns.
    await page.getByRole("button", { name: /^Focus$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    // 2) In the rectangular panel box (Timeline / Overview / Notes / Activity), click the Activity tab.
    //    Scope to the calendar column only — otherwise we match the left nav "Overview" and .last() clicks Library.
    const calendarColumn = page.locator("[id^='mdcontainer-']");
    const overviewInPanel = calendarColumn.getByRole("button", { name: /Overview/i }).first();
    const timelineInPanel = calendarColumn.getByRole("button", { name: /Timeline/i }).first();
    const hasOverview = await overviewInPanel.isVisible().catch(() => false);
    const panelRow = hasOverview
      ? overviewInPanel.locator("..").locator("..")
      : timelineInPanel.locator("..").locator("..");
    await panelRow.getByRole("button").last().click({ timeout: 8_000 });
    await page.waitForTimeout(500);

    // Focus sub-tab inside the Activity panel (not the top bar Focus button).
    await page
      .locator("[id^='mdcontainer-']")
      .getByRole("button", { name: /^Focus$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await expect(page.getByText("No sessions found").first()).toBeVisible({ timeout: 10_000 });
  });

  test("open Overview via command bar (Overview), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Overview");

    const overviewPath = nucleusProductConfig.pathByNavLabel.Overview;
    await page.waitForURL(
      (u) => new RegExp(`^${overviewPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await expect(page.getByText("Overview").first()).toBeVisible({ timeout: 10_000 });
  });

  test("open Overview via UI (click Overview in left nav), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page.getByRole("button", { name: /^Overview$/i }).first().click({ timeout: 5_000 });

    const overviewPath = nucleusProductConfig.pathByNavLabel.Overview;
    await page.waitForURL(
      (u) => new RegExp(`^${overviewPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await expect(page.getByText("Overview").first()).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via command bar (Library), then assert Library and Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Library");

    // Library command may open a panel (URL might not change). Click the enabled Goals card to open Goals list.
    const goalsCard = page.getByRole("button", { name: /^Goals$/i }).and(page.locator(":not([aria-disabled='true'])"));
    await goalsCard.first().waitFor({ state: "visible", timeout: 10_000 });
    await goalsCard.first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    // If panel didn't show Goals list, navigate to Library page and open Goals (same as UI flow).
    const libraryPath = nucleusProductConfig.pathByNavLabel.Library;
    const onLibraryPage = () => new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(page.url()).pathname);
    if (!onLibraryPage()) {
      await page.goto(new URL(libraryPath, baseURL).toString(), { waitUntil: "load" });
      await page.waitForURL((u) => new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(u).pathname), { timeout: 15_000 });
      const goalsBtn = page.getByRole("button", { name: /^Goals$/i }).first();
      await goalsBtn.waitFor({ state: "visible", timeout: 15_000 });
      await goalsBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    }

    // Frame locators cannot be combined with main-frame locators in Playwright; after fallback we're on /library so content is in main.
    const goalsListVisible = page
      .getByRole("textbox", { name: /Search goals/i })
      .or(page.getByPlaceholder("Search goals"))
      .or(page.getByRole("button", { name: /Create new goal/i }))
      .or(page.getByText(/Looks like you don't have any goals/i))
      .first();
    await expect(goalsListVisible).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via command bar (Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Goals");

    // Goals command opens Goals view directly; the Goals nav button is disabled (current view). Just assert list.
    await page.waitForTimeout(1_000);
    await expect(
      page
        .getByRole("textbox", { name: /Search goals/i })
        .or(page.getByPlaceholder("Search goals"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via command bar (Tasks), then assert Tasks list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Tasks");

    // Tasks command opens Tasks view directly; the Tasks nav button is disabled (current view). Just assert list.
    await page.waitForTimeout(1_000);
    // Tasks list: search bar is behind a toggle; identify view by "By month" or "No tasks found" or search box
    await expect(
      page
        .getByRole("textbox", { name: /Search tasks/i })
        .or(page.getByPlaceholder("Search tasks"))
        .or(page.getByRole("button", { name: /By month/i }))
        .or(page.getByText("No tasks found"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via UI (click Library in nav, then Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.getByRole("button", { name: /^Goals$/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(600);

    await expect(
      page
        .getByRole("textbox", { name: /Search goals/i })
        .or(page.getByPlaceholder("Search goals"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via UI (click Library in nav, then Tasks), then assert Tasks list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.getByRole("button", { name: /^Tasks(\s|$)/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(600);

    // Tasks list: search bar is behind a toggle; identify view by "By month" or "No tasks found" or search box
    await expect(
      page
        .getByRole("textbox", { name: /Search tasks/i })
        .or(page.getByPlaceholder("Search tasks"))
        .or(page.getByRole("button", { name: /By month/i }))
        .or(page.getByText("No tasks found"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pin a goal to quick focus via command (Pin a goal to quick focus → search → select → confirm), then assert in pinned list", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E pin goal ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runCommand(page, "Pin a goal to quick focus");
    const pinSearchInput = page.getByPlaceholder("Select a task to pin");
    await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
    await pinSearchInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");

    await page.locator("#cp").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^Focus$/i }).click({ timeout: 5_000 });
    const quickFocusSearch = page.getByPlaceholder("Search a goal to quick focus");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 12_000 });
    await page.waitForTimeout(500);

    const pinnedGoal = page.locator("button").filter({ hasText: goalName }).first();
    await expect(pinnedGoal).toBeVisible({ timeout: 10_000 });
  });

  test("pin a goal to quick focus via UI (Focus → Quick Focus → Edit → Pin another goal → search → select), then assert in pinned list", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E pin UI ${Date.now()}`;

    await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.getByRole("button", { name: /^Goals$/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const newGoalBtn = page.getByRole("button", { name: /New goal/i }).first();
    const createNewGoalBtn = page.getByRole("button", { name: /Create new goal/i }).first();
    const clicked = await newGoalBtn.click({ timeout: 3_000 }).then(() => true).catch(() => false);
    if (!clicked) {
      await createNewGoalBtn.click({ timeout: 5_000 });
    }

    const goalNameInput = page.getByPlaceholder("Enter goal name");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /^Close$/i }).first().click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^Focus$/i }).click({ timeout: 5_000 });
    const quickFocusSearch = page.getByPlaceholder("Search a goal to quick focus");
    await quickFocusSearch.waitFor({ state: "visible", timeout: 12_000 });
    await page.waitForTimeout(500);

    // Search for the goal so Quick Focus shows results (and the Edit button); with no pinned goals the panel only shows empty state and no Edit.
    await quickFocusSearch.fill(goalName);
    await page.waitForTimeout(1_200);

    await page.getByRole("button", { name: "Edit" }).click({ timeout: 5_000 });
    await page.getByRole("button", { name: "Pin another goal" }).click({ timeout: 5_000 });

    const pinSearchInput = page.getByPlaceholder("Select a task to pin");
    await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
    await pinSearchInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");

    await page.locator("#cp").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(800);

    // Clear Quick Focus search so the pinned list is shown and refreshed
    await quickFocusSearch.clear();
    await page.waitForTimeout(600);

    const pinnedGoal = page.locator("button").filter({ hasText: goalName }).first();
    await expect(pinnedGoal).toBeVisible({ timeout: 10_000 });
  });

  test("open Capture via command bar (Capture), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Capture");

    await page.waitForTimeout(1_000);
    const editor = page.getByPlaceholder("Start typing to capture...").or(page.getByRole("textbox", { name: /Markdown editor|Start typing/i })).first();
    const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    const captureText = `E2E capture ${Date.now()}`;
    await page.keyboard.type(captureText, { delay: 50 });
    await page.waitForTimeout(600);

    const saveBtn = page.getByRole("button", { name: /Save/i });
    await saveBtn.waitFor({ state: "visible", timeout: 8_000 });
    await saveBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
  });

  test("open Capture via UI (click Capture in top bar), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await page.getByRole("button", { name: /^Capture$/i }).first().click({ timeout: 5_000 });

    await page.waitForTimeout(1_000);
    const editor = page.getByPlaceholder("Start typing to capture...").or(page.getByRole("textbox", { name: /Markdown editor|Start typing/i })).first();
    const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    const captureText = `E2E capture UI ${Date.now()}`;
    await page.keyboard.type(captureText, { delay: 50 });
    await page.waitForTimeout(600);

    const saveBtn = page.getByRole("button", { name: /Save/i });
    await saveBtn.waitFor({ state: "visible", timeout: 8_000 });
    await saveBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
  });
});


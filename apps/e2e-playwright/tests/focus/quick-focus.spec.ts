import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  readToastNotificationContent,
  runCommand
} from "../utils/helpers";
import {
  closeQuickFocusPanel,
  collectPageErrors,
  expectPinnedGoalVisible,
  getPinnedGoal,
  openQuickFocusPanelViaTopNav,
  waitForSessionElapsed
} from "./focus-test-helpers";
import { readPersistedSessionSnapshot } from "./active-session/session-test-support";

let e2eSeed: E2ESeed;

async function selectObjectiveInPinCommandBar(
  page: import("@playwright/test").Page,
  objectiveName: string
) {
  const pinSearchInput = page.getByTestId("command-bar-input");
  await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
  await pinSearchInput.fill(objectiveName);
  const objectiveResult = page
    .locator("#CMD")
    .getByRole("button", { name: objectiveName, exact: true })
    .last();
  await expect(objectiveResult).toBeVisible({ timeout: 10_000 });
  await objectiveResult.click({ timeout: 5_000 });
  await pinSearchInput.waitFor({ state: "hidden", timeout: 5_000 });
}

function collectRuntimeFailures(page: import("@playwright/test").Page) {
  const failures = collectPageErrors(page);
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    const text = message.text();
    if (
      /state_unsafe_mutation|lifecycle_|destroyed|Cannot read properties/i.test(
        text
      )
    ) {
      failures.push(text);
    }
  });
  return failures;
}

function parseTodayFocusDurationSeconds(text: string) {
  const match = text.match(
    /Today:\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i
  );
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
});

test("open quick focus from top nav without page errors", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await openQuickFocusPanelViaTopNav(page);
  expect(pageErrors).toEqual([]);
});

test("pin objective to quick focus via command bar @smoke", async ({
  page
}) => {
  test.setTimeout(90_000);
  const objectiveName = `E2E pin objective ${Date.now()}`;

  await e2eSeed.focus.objective({ label: objectiveName });

  await runCommand(page, "Pin an objective to quick focus");
  await selectObjectiveInPinCommandBar(page, objectiveName);

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveName
  );

  await closeQuickFocusPanel(page);
  const { quickFocusPanel: reopenedPanel, quickFocusSearch: reopenedSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(reopenedPanel, reopenedSearch, objectiveName);
});

test("pin objective to quick focus via empty-state Pin existing @smoke", async ({
  page
}) => {
  test.setTimeout(90_000);
  const objectiveName = `E2E pin UI ${Date.now()}`;

  await e2eSeed.focus.objective({ label: objectiveName });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);

  await expect(
    quickFocusPanel.getByText("No pinned objectives found")
  ).toBeVisible({ timeout: 15_000 });
  await quickFocusPanel
    .getByRole("button", { name: /^Pin existing$/i })
    .click({ timeout: 5_000 });

  await selectObjectiveInPinCommandBar(page, objectiveName);
  await readToastNotificationContent(page, {
    expectedContent: `Objective ${objectiveName} pinned to quick focus`
  });

  await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveName
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  const { quickFocusPanel: reopenedPanel, quickFocusSearch: reopenedSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(reopenedPanel, reopenedSearch, objectiveName);
});

test("pin another objective via Quick Focus editor @smoke", async ({
  page
}) => {
  test.setTimeout(90_000);
  const pinnedObjectiveName = `E2E already pinned ${Date.now()}`;
  const objectiveToPinName = `E2E pin via editor ${Date.now()}`;

  await e2eSeed.focus.objective({
    label: pinnedObjectiveName,
    isPinnedForQuickFocus: true
  });
  await e2eSeed.focus.objective({ label: objectiveToPinName });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    pinnedObjectiveName
  );

  await quickFocusPanel
    .getByRole("button", { name: /^Edit$/i })
    .click({ timeout: 5_000 });
  await quickFocusPanel
    .getByRole("button", { name: "Pin another objective" })
    .click({ timeout: 5_000 });

  await selectObjectiveInPinCommandBar(page, objectiveToPinName);
  await readToastNotificationContent(page, {
    expectedContent: `Objective ${objectiveToPinName} pinned to quick focus`
  });

  await quickFocusPanel
    .getByRole("button", { name: /^Close editor$/i })
    .click({ timeout: 5_000 });

  await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    pinnedObjectiveName
  );
  await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveToPinName
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  const { quickFocusPanel: reopenedPanel, quickFocusSearch: reopenedSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(
    reopenedPanel,
    reopenedSearch,
    pinnedObjectiveName
  );
  await expectPinnedGoalVisible(
    reopenedPanel,
    reopenedSearch,
    objectiveToPinName
  );
});

test("remove a pinned objective via the top-nav quick-focus entrypoint", async ({
  page
}) => {
  const runtimeFailures = collectRuntimeFailures(page);
  const objectiveName = `E2E quick focus ${Date.now()}`;
  await e2eSeed.focus.objective({
    label: objectiveName,
    isPinnedForQuickFocus: true
  });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);

  const pinnedGoal = await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveName
  );

  await quickFocusPanel
    .getByRole("button", { name: /^Edit$/i })
    .click({ timeout: 5_000 });
  await pinnedGoal.hover();
  await pinnedGoal
    .getByTestId("quick-focus-unpin-action")
    .click({ timeout: 5_000 });
  const expectedToastContent = `Objective ${objectiveName} unpinned from quick focus`;
  await readToastNotificationContent(page, {
    expectedContent: expectedToastContent
  });
  await expect(quickFocusSearch).toHaveValue("", { timeout: 10_000 });
  await expect(pinnedGoal).toBeHidden({ timeout: 15_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  const { quickFocusPanel: reopenedPanel, quickFocusSearch: reopenedSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expect(reopenedSearch).toHaveValue("", { timeout: 10_000 });
  await expect(getPinnedGoal(reopenedPanel, objectiveName)).toBeHidden({
    timeout: 15_000
  });
  expect(runtimeFailures).toEqual([]);
});

test("finished quick focus updates today's pinned objective total", async ({
  page
}) => {
  test.setTimeout(90_000);
  const runtimeFailures = collectRuntimeFailures(page);
  const objectiveName = `E2E quick focus total ${Date.now()}`;
  const minimumFocusSeconds = 3;
  await e2eSeed.focus.objective({
    label: objectiveName,
    isPinnedForQuickFocus: true
  });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);

  const pinnedGoal = await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveName
  );
  await expect(pinnedGoal.getByText("Not focused today")).toBeVisible({
    timeout: 10_000
  });

  const pinnedGoalCard = quickFocusPanel
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  const pinnedGoalAction = pinnedGoalCard
    .locator(":scope > [role='button']")
    .first();
  await pinnedGoalAction.click({ timeout: 5_000 });
  await expect(pinnedGoalCard.getByText(/Now/i)).toBeVisible({
    timeout: 15_000
  });

  const startedAt = Date.now();
  await waitForSessionElapsed(page, minimumFocusSeconds);
  await pinnedGoalAction.click({ timeout: 5_000 });
  await expect(pinnedGoalCard.getByText(/Now/i)).toBeHidden({
    timeout: 15_000
  });
  const measuredElapsedSeconds = (Date.now() - startedAt) / 1000;

  await expect(quickFocusSearch).toHaveValue("", { timeout: 10_000 });
  await quickFocusSearch.hover({ timeout: 5_000 });
  const updatedMatchingGoalCards = quickFocusPanel.locator("button").filter({
    hasText: objectiveName
  });
  await expect(
    updatedMatchingGoalCards.filter({ hasText: /Now/i })
  ).toHaveCount(0, {
    timeout: 15_000
  });
  await expect(
    updatedMatchingGoalCards.filter({ hasText: /Today:/i }).first()
  ).toBeVisible({
    timeout: 15_000
  });

  let todayFocusSeconds = 0;
  await expect
    .poll(
      async () => {
        const cardTexts = await updatedMatchingGoalCards.allInnerTexts();
        todayFocusSeconds = Math.max(
          0,
          ...cardTexts.map((text) => parseTodayFocusDurationSeconds(text) ?? 0)
        );
        return todayFocusSeconds;
      },
      {
        message:
          "finished quick focus updates today's pinned objective total: toBeGreaterThanOrEqual minimumFocusSeconds - 1",
        timeout: 15_000
      }
    )
    .toBeGreaterThanOrEqual(minimumFocusSeconds - 1);
  expect(todayFocusSeconds).toBeLessThanOrEqual(
    Math.ceil(measuredElapsedSeconds) + 8
  );

  await closeQuickFocusPanel(page);
  const { quickFocusPanel: reopenedPanel, quickFocusSearch: reopenedSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await expectPinnedGoalVisible(reopenedPanel, reopenedSearch, objectiveName);
  await expect(
    reopenedPanel
      .locator("button")
      .filter({ hasText: objectiveName })
      .filter({ hasText: /Today:/i })
      .first()
  ).toBeVisible({ timeout: 15_000 });
  expect(runtimeFailures).toEqual([]);
});

test("start quick focus from pinned objective and persist across reload without page errors", async ({
  page
}) => {
  const pageErrors = collectPageErrors(page);

  const objectiveName = `E2E quick focus persist ${Date.now()}`;
  const objective = await e2eSeed.focus.objective({
    label: objectiveName,
    isPinnedForQuickFocus: true
  });

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);

  const pinnedGoal = await expectPinnedGoalVisible(
    quickFocusPanel,
    quickFocusSearch,
    objectiveName
  );
  const pinnedGoalCard = quickFocusPanel
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  await pinnedGoal.click({ timeout: 5_000 });
  await expect(pinnedGoalCard.getByText(/Now/i)).toBeVisible({
    timeout: 15_000
  });
  await expect(
    pinnedGoalCard.getByText(/^(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})$/).first()
  ).toBeVisible({
    timeout: 15_000
  });

  await expect
    .poll(
      async () => {
        const snapshot = await readPersistedSessionSnapshot(page);
        return (
          snapshot?.currentFocusItemId === objective.id &&
          snapshot.isQuickStartOn &&
          snapshot.isSessionRunning &&
          Boolean(snapshot.currentSessionId)
        );
      },
      {
        message:
          "start quick focus from pinned objective and persist across re...: toBe true",
        timeout: 15_000
      }
    )
    .toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  const {
    quickFocusPanel: restoredQuickFocusPanel,
    quickFocusSearch: restoredQuickFocusSearch
  } = await openQuickFocusPanelViaTopNav(page);
  await expect(restoredQuickFocusSearch).toHaveValue("", {
    timeout: 10_000
  });
  const restoredPinnedGoalCard = restoredQuickFocusPanel
    .locator("button")
    .filter({ hasText: objectiveName })
    .first();
  await expect(restoredPinnedGoalCard.getByText(/Now/i)).toBeVisible({
    timeout: 15_000
  });
  await expect(
    restoredPinnedGoalCard
      .getByText(/^(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})$/)
      .first()
  ).toBeVisible({
    timeout: 15_000
  });
  expect(pageErrors).toEqual([]);
});

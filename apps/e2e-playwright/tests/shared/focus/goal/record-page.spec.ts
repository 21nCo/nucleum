import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  getProductConfig
} from "../../../utils/helpers";
import {
  addCollectionThroughCollectionsLane,
  expectCollectionRecordOpenedFromLane,
  expectCollectionTagAbsent,
  expectCollectionTagVisible,
  openCollectionFromCollectionsLane,
  removeCollectionThroughCollectionsLane
} from "../../../utils/collections-lane";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("goal - record page (opening flows, visibility, tab switching) @regression @feature @focus-feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function createGoal(page: import("@playwright/test").Page, goalName: string) {
    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  async function openGoalRecordFromLibrary(
    page: import("@playwright/test").Page,
    goalName: string
  ) {
    await page.goto("/library?resource=goal&type=all", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(1_200);
    const row = page.locator(".resource").filter({ hasText: goalName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  async function createCollection(
    page: import("@playwright/test").Page,
    collectionName: string
  ) {
    await runCommand(page, "Create a new collection");
    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(collectionName);
    const modal = page.locator("#collection_create");
    await modal.getByRole("button", { name: /Save.*Enter/i }).click({
      timeout: 8_000
    });
    await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(800);
  }

  async function switchGoalRecordTab(
    page: import("@playwright/test").Page,
    label: string
  ) {
    const tab = page.getByRole("tab", {
      name: new RegExp(`^${escapeRegex(label)}$`, "i")
    }).first();
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click({ timeout: 5_000 });
    await expect(tab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000
    });
    await page.waitForTimeout(800);
  }

  async function resolveVisibleSubGoalInput(
    page: import("@playwright/test").Page
  ) {
    const candidates = [
      page.getByPlaceholder("Add new subgoal").first(),
      page.getByPlaceholder("Add a subgoal").first()
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }

    const fallback = page
      .locator('input[placeholder="Add new subgoal"], input[placeholder="Add a subgoal"]')
      .first();
    await expect(fallback).toBeVisible({ timeout: 10_000 });
    return fallback;
  }

  async function showSubGoalsSurface(page: import("@playwright/test").Page) {
    const tab = page.getByRole("tab", {
      name: new RegExp(`^${escapeRegex("Sub goals")}$`, "i")
    }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5_000
      });
      await page.waitForTimeout(800);
    }
    await resolveVisibleSubGoalInput(page);
  }

  async function addSubGoalFromRecordPage(
    page: import("@playwright/test").Page,
    label: string
  ) {
    await showSubGoalsSurface(page);
    const input = await resolveVisibleSubGoalInput(page);
    await input.fill(label);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: new RegExp(escapeRegex(label)) }).first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async function openSubGoalFromRecordPage(
    page: import("@playwright/test").Page,
    label: string
  ) {
    const subGoalButton = page.getByRole("button", {
      name: new RegExp(escapeRegex(label))
    }).first();
    await expect(subGoalButton).toBeVisible({ timeout: 10_000 });
    await subGoalButton.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
  }

  async function clickGoalBreadcrumb(
    page: import("@playwright/test").Page,
    label: string
  ) {
    const breadcrumb = page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(label)}$`)
    }).first();
    await expect(breadcrumb).toBeVisible({ timeout: 10_000 });
    await breadcrumb.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
  }

  async function createTaskFromGoalRecordPage(
    page: import("@playwright/test").Page,
    label: string
  ) {
    await switchGoalRecordTab(page, "Tasks");
    const createTaskButton = page.getByRole("button", {
      name: /Create task|New task/i
    }).first();
    await expect(createTaskButton).toBeVisible({ timeout: 10_000 });
    await createTaskButton.click({ timeout: 5_000 });
    const taskNameInput = page.getByTestId("task-name-input").first();
    await expect(taskNameInput).toBeVisible({ timeout: 10_000 });
    await taskNameInput.fill(label);
    await taskNameInput.press("Enter");
    await expectTaskRowVisible(page, label);
  }

  async function openTaskFromGoalRecordPage(
    page: import("@playwright/test").Page,
    label: string
  ) {
    const isTaskLibraryVisible = await page
      .locator("#task-library")
      .first()
      .isVisible()
      .catch(() => false);
    if (!isTaskLibraryVisible) {
      await switchGoalRecordTab(page, "Tasks");
    }
    const taskRow = await resolveTaskRowByLabel(page, label);
    await taskRow.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
  }

  async function expectTaskRecordVisible(
    page: import("@playwright/test").Page,
    label: string
  ) {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("task-name-input").first().isVisible().catch(() => false)) ||
          (await page.getByRole("textbox", { name: /Task name/i }).first().isVisible().catch(() => false)) ||
          (await page.getByRole("heading", { name: new RegExp(escapeRegex(label)) }).first().isVisible().catch(() => false)) ||
          (await page.getByRole("button", { name: /Close/i }).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);
  }

  async function resolveTaskRowByLabel(
    page: import("@playwright/test").Page,
    label: string
  ) {
    const rows = page.locator("#task-library .resource");
    const deadline = Date.now() + 15_000;

    while (Date.now() < deadline) {
      const count = await rows.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const row = rows.nth(index);
        if (!(await row.isVisible().catch(() => false))) continue;

        const text = (await row.textContent().catch(() => "")) ?? "";
        if (text.includes(label)) return row;

        const input = row.locator('input[placeholder="Task name"]').first();
        const value = await input.inputValue().catch(() => "");
        if (value.trim() === label) return row;
      }
      await page.waitForTimeout(250);
    }

    throw new Error(`Task row not found: ${label}`);
  }

  async function expectTaskRowVisible(
    page: import("@playwright/test").Page,
    label: string
  ) {
    await expect
      .poll(
        async () => {
          try {
            await resolveTaskRowByLabel(page, label);
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 15_000 }
      )
      .toBe(true);
  }

  test("open goal record page and assert panels/expected content visible", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.goal,
      "Goal record page is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const goalName = `E2E goal record ${Date.now()}`;
    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    await expect(page.getByText(goalName).first()).toBeVisible({
      timeout: 20_000
    });
    await expectGoalRecordContent(page, "Info", goalName);
  });

  test("tab switching and visibility check on goal record page", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const goalName = `E2E goal tabs ${Date.now()}`;
    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    const tabList = page.getByRole("tablist").first();
    await expect(tabList).toBeVisible({ timeout: 10_000 });

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      const label =
        (await tab.getAttribute("aria-label"))?.trim() ||
        (await tab.textContent())?.trim() ||
        "";
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5_000
      });
      await expectGoalRecordContent(page, label, goalName);
    }
  });

  test("create sub goal from goal record page and navigate hierarchy via breadcrumbs", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const parentGoalName = `E2E goal parent ${Date.now()}`;
    const childGoalName = `${parentGoalName} child`;

    await createGoal(page, parentGoalName);
    await openGoalRecordFromLibrary(page, parentGoalName);
    await addSubGoalFromRecordPage(page, childGoalName);
    await openSubGoalFromRecordPage(page, childGoalName);

    await expect(page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(parentGoalName)}$`)
    }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(childGoalName)}$`)
    }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(childGoalName).first()).toBeVisible({
      timeout: 10_000
    });

    await clickGoalBreadcrumb(page, parentGoalName);
    await expect(page.getByText(parentGoalName).first()).toBeVisible({
      timeout: 10_000
    });

    await openGoalRecordFromLibrary(page, parentGoalName);
    await showSubGoalsSurface(page);
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegex(childGoalName))
      }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create grandchild goal from child goal record page and persist hierarchy after reopen", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const parentGoalName = `E2E goal hierarchy ${Date.now()}`;
    const childGoalName = `${parentGoalName} child`;
    const grandchildGoalName = `${parentGoalName} grandchild`;

    await createGoal(page, parentGoalName);
    await openGoalRecordFromLibrary(page, parentGoalName);
    await addSubGoalFromRecordPage(page, childGoalName);
    await openSubGoalFromRecordPage(page, childGoalName);
    await addSubGoalFromRecordPage(page, grandchildGoalName);
    await openSubGoalFromRecordPage(page, grandchildGoalName);

    await expect(page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(parentGoalName)}$`)
    }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(childGoalName)}$`)
    }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#breadcrumb-item-label").filter({
      hasText: new RegExp(`^${escapeRegex(grandchildGoalName)}$`)
    }).first()).toBeVisible({ timeout: 10_000 });

    await clickGoalBreadcrumb(page, childGoalName);
    await expect(page.getByText(childGoalName).first()).toBeVisible({
      timeout: 10_000
    });

    await clickGoalBreadcrumb(page, parentGoalName);
    await expect(page.getByText(parentGoalName).first()).toBeVisible({
      timeout: 10_000
    });

    await openGoalRecordFromLibrary(page, parentGoalName);
    await showSubGoalsSurface(page);
    await openSubGoalFromRecordPage(page, childGoalName);
    await showSubGoalsSurface(page);
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegex(grandchildGoalName))
      }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create task from goal record page and verify persistence after reopen", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const goalName = `E2E goal task parent ${Date.now()}`;
    const taskName = `${goalName} task`;

    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);
    await createTaskFromGoalRecordPage(page, taskName);

    await openGoalRecordFromLibrary(page, goalName);
    await switchGoalRecordTab(page, "Tasks");
    await expectTaskRowVisible(page, taskName);
  });

  test("open task created from goal record page", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const goalName = `E2E goal open task ${Date.now()}`;
    const taskName = `${goalName} task`;

    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);
    await createTaskFromGoalRecordPage(page, taskName);
    await openTaskFromGoalRecordPage(page, taskName);
    await expectTaskRecordVisible(page, taskName);
  });

  test("add collection from goal record page collections lane and verify unlink persists after reopen", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const goalName = `GoalCL-${token}`;
    const collectionName = `GCol-${token}`;
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.stack ?? String(error));
    });

    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    await addCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagVisible(page, collectionName);

    await openGoalRecordFromLibrary(page, goalName);
    await expectCollectionTagVisible(page, collectionName);
    expect(pageErrors).toEqual([]);

    await removeCollectionThroughCollectionsLane(page, collectionName);
    await openGoalRecordFromLibrary(page, goalName);
    await expectCollectionTagAbsent(page, collectionName);
    expect(pageErrors).toEqual([]);
  });

  test("open linked collection from goal record page collections lane", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal ||
        !productConfig.capabilities.records.goalTabs,
      "Goal record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const goalName = `GoalCLNav-${token}`;
    const collectionName = `GColNav-${token}`;

    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    await addCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagVisible(page, collectionName);
    await openCollectionFromCollectionsLane(page, collectionName);
    await expectCollectionRecordOpenedFromLane(page, collectionName);
  });

  test("goal page status changes do not crash when collections are present", async ({
    page
  }, testInfo) => {
    test.setTimeout(150_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.goal,
      "Goal record page is not part of this product contract"
    );
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.stack ?? String(error));
    });

    await ensureInAppOnHome(page);

    const suffix = Date.now();
    const collectionName = `GoalStatusCol-${suffix}`;
    const goalName = `GoalStatus-${suffix}`;

    await createCollection(page, collectionName);
    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);
    await addCollectionThroughCollectionsLane(page, collectionName);
    await expect(page.getByText(/^Collections$/i).first()).toBeVisible({
      timeout: 10_000
    });
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegex(collectionName.slice(0, 18)))
      }).first()
    ).toBeVisible({ timeout: 10_000 });

    const statusSection = page
      .getByText(/^Status$/i)
      .locator("xpath=ancestor::div[1]")
      .first();
    const statusButtons = statusSection.locator("button");
    await expect(statusButtons.nth(1)).toBeVisible({ timeout: 10_000 });
    await statusButtons.nth(1).click({ timeout: 5_000 });
    await page.waitForTimeout(1000);

    expect(pageErrors).toEqual([]);
  });
});

async function expectGoalRecordContent(
  page: import("@playwright/test").Page,
  tabLabel: string,
  goalName: string
) {
  const lowerLabel = tabLabel.toLowerCase();
  if (lowerLabel.includes("info")) {
    const infoAnchors = [
      page.getByTestId("goal-name-input"),
      page.getByRole("heading", { name: new RegExp(`^${goalName}$`) }).first(),
      page.getByText(/Created:/i).first(),
      page.getByText(/Status/i).first()
    ];
    await expect
      .poll(
        async () => {
          for (const anchor of infoAnchors) {
            if (await anchor.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: 10_000 }
      )
      .toBe(true);
    return;
  }
  if (lowerLabel.includes("task")) {
    await expect
      .poll(
        async () =>
          (await page.getByText(/No tasks found|Inbox zero/i).first().isVisible().catch(() => false)) ||
          (await page.getByRole("textbox", { name: /Search tasks/i }).first().isVisible().catch(() => false)) ||
          (await page.getByRole("button", { name: /New task|Create new task/i }).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);
    return;
  }
  if (lowerLabel.includes("activity")) {
    await expect
      .poll(
        async () =>
          (await page.getByText(/Focus sessions/i).first().isVisible().catch(() => false)) ||
          (await page.getByText(/History not available/i).first().isVisible().catch(() => false)) ||
          (await page.getByText(/^All$/i).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);
    return;
  }
  if (lowerLabel.includes("analytics")) {
    await expect
      .poll(
        async () =>
          (await page.getByText(/Total focus/i).first().isVisible().catch(() => false)) ||
          (await page.getByText(/No data available/i).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);
    return;
  }
  await expect(page.getByText(goalName).first()).toBeVisible({ timeout: 10_000 });
}

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { expectAnyLocatorVisible } from "../../utils/locator-assertions";
import {
  getResourceThumbnails,
  openResourceRecord,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";
import {
  addCollectionThroughCollectionsLane,
  expectCollectionRecordOpenedFromLane,
  expectCollectionTagAbsent,
  expectCollectionTagVisible,
  openCollectionFromCollectionsLane,
  removeCollectionThroughCollectionsLane
} from "../../utils/collections-lane";
import { readResourcesByLabel } from "../active-session/session-test-support";
import {
  blockGoogleAccountsNavigation,
  collectPageErrors
} from "../focus-test-helpers";
import { expectTaskRecordVisible } from "../tasks/task-test-helpers";

let e2eSeed: E2ESeed;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

async function openGoalRecordFromLibrary(
  page: import("@playwright/test").Page,
  objectiveName: string
) {
  await openResourceRecord(page, test.info().project.name, "objective", {
    label: objectiveName
  });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 15_000
  });
}

async function switchGoalRecordTab(
  page: import("@playwright/test").Page,
  label: string
) {
  const tab = page
    .getByRole("tab", {
      name: new RegExp(`^${escapeRegex(label)}$`, "i")
    })
    .first();
  await expect(tab).toBeVisible({ timeout: 10_000 });
  await tab.click({ timeout: 5_000 });
  await expect(tab).toHaveAttribute("aria-selected", "true", {
    timeout: 5_000
  });
}

async function resolveVisibleSubGoalInput(
  page: import("@playwright/test").Page
) {
  const input = page
    .getByPlaceholder(/Add (?:new )?sub-objective/i)
    .filter({ visible: true })
    .first();
  await expect(input).toBeVisible({ timeout: 10_000 });
  return input;
}

async function showSubObjectivesSurface(page: import("@playwright/test").Page) {
  const tab = page
    .getByRole("tab", {
      name: new RegExp(`^${escapeRegex("Sub objectives")}$`, "i")
    })
    .first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ timeout: 5_000 });
    await expect(tab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000
    });
  }
  await resolveVisibleSubGoalInput(page);
}

async function addSubGoalFromRecordPage(
  page: import("@playwright/test").Page,
  label: string
) {
  await showSubObjectivesSurface(page);
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
  const subGoalButton = page
    .getByRole("button", {
      name: new RegExp(escapeRegex(label))
    })
    .first();
  await expect(subGoalButton).toBeVisible({ timeout: 10_000 });
  await subGoalButton.click({ timeout: 5_000 });
}

async function clickGoalBreadcrumb(
  page: import("@playwright/test").Page,
  label: string
) {
  const breadcrumb = page
    .locator("#breadcrumb-item-label")
    .filter({
      hasText: new RegExp(`^${escapeRegex(label)}$`)
    })
    .first();
  await expect(breadcrumb).toBeVisible({ timeout: 10_000 });
  await breadcrumb.click({ timeout: 5_000 });
}

async function createTaskFromGoalRecordPage(
  page: import("@playwright/test").Page,
  label: string
) {
  await switchGoalRecordTab(page, "Tasks");
  const createTaskButton = page
    .getByRole("button", {
      name: /Create task|New task/i
    })
    .first();
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
  const tasksTab = page.getByRole("tab", { name: /^Tasks$/i }).first();
  if ((await tasksTab.getAttribute("aria-selected")) !== "true") {
    await switchGoalRecordTab(page, "Tasks");
  }
  const taskRow = await resolveTaskRowByLabel(page, label);
  await taskRow.click({ timeout: 5_000 });
}

async function resolveTaskRowByLabel(
  page: import("@playwright/test").Page,
  label: string
) {
  requireResourceBrowseContract(test.info().project.name, "task");
  const rows = getResourceThumbnails(page);
  let matchingIndex = -1;
  await expect(async () => {
    const count = await rows.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      if (!(await row.isVisible().catch(() => false))) continue;

      const text = (await row.textContent().catch(() => "")) ?? "";
      const input = row.locator('input[placeholder="Task name"]').first();
      const value = await input.inputValue().catch(() => "");
      if (!text.includes(label) && value.trim() !== label) continue;

      matchingIndex = index;
      await expect(row).toBeVisible({ timeout: 500 });
      return;
    }
    throw new Error(`Task row "${label}" is not available yet.`);
  }, `task row "${label}" resolves to a visible resource`).toPass({
    timeout: 15_000
  });
  const matchingRow = rows.nth(matchingIndex);
  await expect(matchingRow, `task row "${label}" is visible`).toBeVisible({
    timeout: 5_000
  });
  return matchingRow;
}

async function expectTaskRowVisible(
  page: import("@playwright/test").Page,
  label: string
) {
  await resolveTaskRowByLabel(page, label);
}

test("open objective record page and assert panels/expected content visible @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E objective record ${Date.now()}`;
  await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);

  await expect(page.getByText(objectiveName).first()).toBeVisible({
    timeout: 20_000
  });
  await expectGoalRecordContent(page, "Info", objectiveName);
});

test("tab switching and visibility check on objective record page @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E objective tabs ${Date.now()}`;
  await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);

  const tabList = page.getByRole("tablist").first();
  await expect(tabList).toBeVisible({ timeout: 10_000 });

  const tabs = tabList.getByRole("tab");
  await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

  const tabCount = await tabs.count();
  const clickIndexes = Array.from(
    { length: Math.min(tabCount, 3) },
    (_, i) => i
  );
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
    await expectGoalRecordContent(page, label, objectiveName);
  }
});

test("create sub objective from objective record page and navigate hierarchy via breadcrumbs @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const parentGoalName = `E2E objective parent ${Date.now()}`;
  const childGoalName = `${parentGoalName} child`;

  await e2eSeed.focus.objective({ label: parentGoalName });
  await openGoalRecordFromLibrary(page, parentGoalName);
  await addSubGoalFromRecordPage(page, childGoalName);
  await openSubGoalFromRecordPage(page, childGoalName);

  await expect(
    page
      .locator("#breadcrumb-item-label")
      .filter({
        hasText: new RegExp(`^${escapeRegex(parentGoalName)}$`)
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page
      .locator("#breadcrumb-item-label")
      .filter({
        hasText: new RegExp(`^${escapeRegex(childGoalName)}$`)
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(childGoalName).first()).toBeVisible({
    timeout: 10_000
  });

  await clickGoalBreadcrumb(page, parentGoalName);
  await expect(page.getByText(parentGoalName).first()).toBeVisible({
    timeout: 10_000
  });

  await openGoalRecordFromLibrary(page, parentGoalName);
  await showSubObjectivesSurface(page);
  await expect(
    page
      .getByRole("button", {
        name: new RegExp(escapeRegex(childGoalName))
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
});

test("create grandchild objective from child objective record page and persist hierarchy after reopen @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const parentGoalName = `E2E objective hierarchy ${Date.now()}`;
  const childGoalName = `${parentGoalName} child`;
  const grandchildGoalName = `${parentGoalName} grandchild`;

  await e2eSeed.focus.objective({ label: parentGoalName });
  await openGoalRecordFromLibrary(page, parentGoalName);
  await addSubGoalFromRecordPage(page, childGoalName);
  await openSubGoalFromRecordPage(page, childGoalName);
  await addSubGoalFromRecordPage(page, grandchildGoalName);
  await openSubGoalFromRecordPage(page, grandchildGoalName);

  await expect(
    page
      .locator("#breadcrumb-item-label")
      .filter({
        hasText: new RegExp(`^${escapeRegex(parentGoalName)}$`)
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page
      .locator("#breadcrumb-item-label")
      .filter({
        hasText: new RegExp(`^${escapeRegex(childGoalName)}$`)
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page
      .locator("#breadcrumb-item-label")
      .filter({
        hasText: new RegExp(`^${escapeRegex(grandchildGoalName)}$`)
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });

  await clickGoalBreadcrumb(page, childGoalName);
  await expect(page.getByText(childGoalName).first()).toBeVisible({
    timeout: 10_000
  });

  await clickGoalBreadcrumb(page, parentGoalName);
  await expect(page.getByText(parentGoalName).first()).toBeVisible({
    timeout: 10_000
  });

  await openGoalRecordFromLibrary(page, parentGoalName);
  await showSubObjectivesSurface(page);
  await openSubGoalFromRecordPage(page, childGoalName);
  await showSubObjectivesSurface(page);
  await expect(
    page
      .getByRole("button", {
        name: new RegExp(escapeRegex(grandchildGoalName))
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });
});

test("create task from objective record page and verify persistence after reopen @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E objective task parent ${Date.now()}`;
  const taskName = `${objectiveName} task`;

  await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);
  await createTaskFromGoalRecordPage(page, taskName);

  await openGoalRecordFromLibrary(page, objectiveName);
  await switchGoalRecordTab(page, "Tasks");
  await expectTaskRowVisible(page, taskName);
});

test("open task from objective record page @record-page", async ({ page }) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E objective open task ${Date.now()}`;
  const taskName = `${objectiveName} task`;

  const objective = await e2eSeed.focus.objective({ label: objectiveName });
  await e2eSeed.focus.task({ label: taskName, objectiveId: objective.id });
  await openGoalRecordFromLibrary(page, objectiveName);
  await openTaskFromGoalRecordPage(page, taskName);
  await expectTaskRecordVisible(page, { label: taskName, timeout: 10_000 });
});

test("add collection from objective record page collections lane and verify unlink persists after reopen @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const token = String(Date.now()).slice(-6);
  const objectiveName = `ObjectiveCL-${token}`;
  const collectionName = `GCol-${token}`;
  const pageErrors = collectPageErrors(page, { includeStack: true });

  await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);

  await addCollectionThroughCollectionsLane(page, collectionName);
  await expectCollectionTagVisible(page, collectionName);

  await openGoalRecordFromLibrary(page, objectiveName);
  await expectCollectionTagVisible(page, collectionName);
  expect(pageErrors).toEqual([]);

  await removeCollectionThroughCollectionsLane(page, collectionName);
  await openGoalRecordFromLibrary(page, objectiveName);
  await expectCollectionTagAbsent(page, collectionName);
  expect(pageErrors).toEqual([]);
});

test("open linked collection from objective record page collections lane @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const token = String(Date.now()).slice(-6);
  const objectiveName = `ObjectiveCLNav-${token}`;
  const collectionName = `GColNav-${token}`;

  await e2eSeed.collections.collection({
    label: collectionName,
    resource: "objective"
  });
  await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);

  await addCollectionThroughCollectionsLane(page, collectionName);
  await expectCollectionTagVisible(page, collectionName);
  await openCollectionFromCollectionsLane(page, collectionName);
  await expectCollectionRecordOpenedFromLane(page, collectionName);
});

test("objective page status changes do not crash when collections are present @record-page", async ({
  page
}) => {
  test.setTimeout(150_000);
  const pageErrors = collectPageErrors(page, { includeStack: true });

  await ensureInAppOnHome(page);

  const suffix = Date.now();
  const collectionName = `ObjectiveStatusCol-${suffix}`;
  const objectiveName = `ObjectiveStatus-${suffix}`;

  await e2eSeed.collections.collection({
    label: collectionName,
    resource: "objective"
  });
  const objective = await e2eSeed.focus.objective({ label: objectiveName });
  await openGoalRecordFromLibrary(page, objectiveName);
  await addCollectionThroughCollectionsLane(page, collectionName);
  await expect(page.getByText(/^Collections$/i).first()).toBeVisible({
    timeout: 10_000
  });
  await expect(
    page
      .getByRole("button", {
        name: new RegExp(escapeRegex(collectionName.slice(0, 18)))
      })
      .first()
  ).toBeVisible({ timeout: 10_000 });

  const statusSection = page
    .getByText(/^Status$/i)
    .locator("xpath=ancestor::div[1]")
    .first();
  const statusButtons = statusSection.locator("button");
  await expect(statusButtons.nth(1)).toBeVisible({ timeout: 10_000 });
  await statusButtons.nth(1).click({ timeout: 5_000 });
  await expect(statusSection.getByText(/^In progress$/i)).toBeVisible({
    timeout: 10_000
  });

  await expect
    .poll(
      async () => {
        const [persisted] = await readResourcesByLabel(
          page,
          "objective",
          objectiveName
        );
        return persisted?.id === objective.id ? persisted.status : undefined;
      },
      {
        message:
          "objective page status changes do not crash when collections a...: reaches its expected value"
      }
    )
    .not.toBe("NOT_STARTED");

  await openGoalRecordFromLibrary(page, objectiveName);
  await expect(page.getByText(/^In progress$/i).first()).toBeVisible({
    timeout: 10_000
  });

  expect(pageErrors).toEqual([]);
});

async function expectGoalRecordContent(
  page: import("@playwright/test").Page,
  tabLabel: string,
  objectiveName: string
) {
  const lowerLabel = tabLabel.toLowerCase();
  if (lowerLabel.includes("info")) {
    const infoAnchors = [
      page.getByTestId("objective-name-input"),
      page
        .getByRole("heading", { name: new RegExp(`^${objectiveName}$`) })
        .first(),
      page.getByText(/Created:/i).first(),
      page.getByText(/Status/i).first()
    ];
    await expectAnyLocatorVisible(infoAnchors, {
      message: "objective info panel exposes a visible content anchor",
      timeout: 10_000
    });
    return;
  }
  if (lowerLabel.includes("task")) {
    await expectAnyLocatorVisible(
      [
        page.getByText(/No tasks found|Inbox zero/i).first(),
        page.getByRole("textbox", { name: /Search tasks/i }).first(),
        page.getByRole("button", { name: /New task|Create new task/i }).first()
      ],
      {
        message: "objective tasks panel exposes controls or its empty state",
        timeout: 10_000
      }
    );
    return;
  }
  if (lowerLabel.includes("activity")) {
    await expectAnyLocatorVisible(
      [
        page.getByText(/Focus sessions/i).first(),
        page.getByText(/History not available/i).first(),
        page.getByText(/^All$/i).first()
      ],
      {
        message: "objective activity panel exposes history or its empty state",
        timeout: 10_000
      }
    );
    return;
  }
  if (lowerLabel.includes("analytics")) {
    await expectAnyLocatorVisible(
      [
        page.getByText(/Total focus/i).first(),
        page.getByText(/No data available/i).first()
      ],
      {
        message: "objective analytics panel exposes metrics or its empty state",
        timeout: 10_000
      }
    );
    return;
  }
  await expect(page.getByText(objectiveName).first()).toBeVisible({
    timeout: 10_000
  });
}

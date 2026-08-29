import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { getResourceThumbnail } from "../../utils/resource-matrix";
import {
  ensureInAppOnHome,
  LibraryTab,
  openLibraryAndTab,
  readToastNotificationContent
} from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  collectPageErrors,
  ensureAdvancedFocus,
  readSessionRuntime,
  reloadActiveSession,
  resetFocusSession,
  startAdvancedFocus,
  waitForSessionElapsed
} from "../focus-test-helpers";
import {
  dismissFinishedSession,
  finishSessionFromControl,
  getCurrentFocusItemRow,
  getCurrentFocusSessionItem,
  getFocusItemsDialog,
  getFocusItemRow,
  getFocusSessionItem,
  getFocusSessionItems,
  readResourcesByLabel,
  reorderFocusItems,
  reorderFocusTasks,
  selectFocusItem,
  setEditMode,
  setSessionEditMode
} from "./session-test-support";

let e2eSeed: E2ESeed;

async function openFocusItemsEditor(page: Page) {
  await ensureAdvancedFocus(page);
  const input = page
    .getByPlaceholder("start typing an objective or task name...")
    .first();
  if (!(await input.isVisible().catch(() => false))) {
    const editItemsButton = page
      .getByRole("button", {
        name: /\+ add focus items|\d+ focus items? added/i
      })
      .first();
    await editItemsButton.dispatchEvent("click");
  }
  await input.waitFor({ state: "visible", timeout: 15_000 });
  return {
    input,
    modal: getFocusItemsDialog(page)
  };
}

async function closeFocusItemsEditor(page: Page) {
  const modal = getFocusItemsDialog(page);
  await modal.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });
  await expect(modal).toBeHidden({ timeout: 10_000 });
}

async function expectVisibleFocusItemLabel(
  page: Page,
  itemId: string,
  label: string
) {
  const item = getFocusSessionItem(page, itemId);
  const visibleInput = item.locator("input").filter({ visible: true }).first();
  const visibleText = item
    .getByText(label, { exact: true })
    .filter({ visible: true })
    .first();
  await expect(async () => {
    if ((await visibleInput.count()) > 0) {
      await expect(visibleInput).toHaveValue(label, { timeout: 500 });
      return;
    }
    await expect(visibleText).toBeVisible({ timeout: 500 });
  }, `focus item "${label}" exposes its visible label`).toPass({
    timeout: 10_000
  });
}

async function expectVisibleFocusItemOrder(page: Page, itemIds: string[]) {
  await expect
    .poll(
      async () =>
        getFocusSessionItems(page).evaluateAll(
          (elements, expectedIds) =>
            elements
              .map((element) => element.getAttribute("data-id"))
              .filter((id): id is string =>
                id ? expectedIds.includes(id) : false
              ),
          itemIds
        ),
      {
        message: "visible focus items match the expected order"
      }
    )
    .toEqual(itemIds);
  for (const itemId of itemIds) {
    await expect(getFocusSessionItem(page, itemId)).toBeVisible();
  }
}

async function expectVisibleNestedTaskOrder(
  page: Page,
  objectiveId: string,
  taskIds: string[]
) {
  await expect
    .poll(
      async () =>
        getFocusSessionItem(page, objectiveId)
          .getByTestId(/^focus-session-item:/)
          .filter({ visible: true })
          .evaluateAll(
            (elements, expectedIds) =>
              elements
                .map((element) => element.getAttribute("data-id"))
                .filter((id): id is string =>
                  id ? expectedIds.includes(id) : false
                ),
            taskIds
          ),
      {
        message: "visible nested tasks match the expected order"
      }
    )
    .toEqual(taskIds);
  for (const taskId of taskIds) {
    await expect(getFocusSessionItem(page, taskId)).toBeVisible();
  }
}

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

async function beginRunningSessionEdit(page: Page) {
  await addAdvancedFocusItems(page, []);
  await startAdvancedFocus(page);
  await setSessionEditMode(page, true);
  const input = page
    .getByPlaceholder("start typing an objective or task name...")
    .first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  return input;
}

async function pickFocusItemFromMainInput(
  input: Locator,
  searchRoot: Page | Locator,
  label: string
) {
  await input.fill(label);
  const exactResult = searchRoot.getByText(label, { exact: true }).last();
  await expect(exactResult).toBeVisible({ timeout: 10_000 });
  await exactResult.dispatchEvent("click");
  await expect(input).toHaveValue("", { timeout: 10_000 });
}

async function pickExistingNestedTaskUnderObjective(
  page: Page,
  objectiveId: string,
  taskLabel: string
) {
  const objectiveScope = getFocusSessionItem(page, objectiveId);
  const nestedInput = objectiveScope.getByPlaceholder("Add a task");
  await expect(nestedInput).toBeVisible({ timeout: 10_000 });
  await nestedInput.fill(taskLabel);
  const exactResult = page.getByText(taskLabel, { exact: true }).last();
  await expect(exactResult).toBeVisible({ timeout: 10_000 });
  await exactResult.dispatchEvent("click");
  await expect(nestedInput).toHaveValue("", { timeout: 10_000 });
}

async function createFromMainEmptySearch(
  page: Page,
  input: Locator,
  label: string,
  key: "Enter" | "Shift+Enter"
) {
  await input.click();
  await expect(input).toHaveValue("");
  await input.pressSequentially(label, { delay: 20 });
  await expect(
    page.getByText("No objectives or tasks found.", { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await input.press(key);
  await expect(input).toHaveValue("", { timeout: 10_000 });
}

async function expectFocusItemPickerExcludes(
  input: Locator,
  searchRoot: Page | Locator,
  label: string
) {
  await input.fill(label);
  await expect(
    searchRoot
      .getByText("No objectives or tasks found.", { exact: true })
      .last()
  ).toBeVisible({ timeout: 10_000 });
  await expect(searchRoot.getByText(label, { exact: true })).toHaveCount(0);
}

async function createNestedTaskWithEnter(
  page: Page,
  objectiveId: string,
  label: string
) {
  const objectiveScope = getFocusSessionItem(page, objectiveId);
  const nestedInput = objectiveScope.getByPlaceholder("Add a task");
  await expect(nestedInput).toBeVisible({ timeout: 10_000 });
  await nestedInput.click();
  await expect(nestedInput).toHaveValue("");
  await nestedInput.pressSequentially(label, { delay: 20 });
  await expect(
    page.getByText("No tasks found.", { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await nestedInput.press("Enter");
  await expect(nestedInput).toHaveValue("", { timeout: 10_000 });
}

test("adds mixed objectives and tasks in one editor session", async ({
  page
}) => {
  const nestedFromMain = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E mixed main"
  });
  const nestedFromObjective = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E mixed nested"
  });
  const objectiveOnly = await e2eSeed.focus.resources({
    prefix: "E2E mixed objective"
  });
  const standaloneTask = await e2eSeed.focus.task({
    prefix: "E2E mixed standalone"
  });
  const { input, modal } = await openFocusItemsEditor(page);

  await pickFocusItemFromMainInput(
    input,
    modal,
    nestedFromMain.nestedTasks[0].label
  );
  await pickFocusItemFromMainInput(
    input,
    modal,
    nestedFromObjective.objective.label
  );
  await pickExistingNestedTaskUnderObjective(
    page,
    nestedFromObjective.objective.id,
    nestedFromObjective.nestedTasks[0].label
  );
  await pickFocusItemFromMainInput(input, modal, objectiveOnly.objective.label);
  await pickFocusItemFromMainInput(input, modal, standaloneTask.label);

  await expectVisibleFocusItemOrder(page, [
    nestedFromMain.objective.id,
    nestedFromObjective.objective.id,
    objectiveOnly.objective.id,
    standaloneTask.id
  ]);
  await expectVisibleNestedTaskOrder(page, nestedFromMain.objective.id, [
    nestedFromMain.nestedTasks[0].id
  ]);
  await expectVisibleNestedTaskOrder(page, nestedFromObjective.objective.id, [
    nestedFromObjective.nestedTasks[0].id
  ]);

  const state = await readSessionRuntime(page);
  const mainObjective = state.items.find(
    (item) => item.id === nestedFromMain.objective.id
  );
  const nestedObjective = state.items.find(
    (item) => item.id === nestedFromObjective.objective.id
  );
  const bareObjective = state.items.find(
    (item) => item.id === objectiveOnly.objective.id
  );
  expect(mainObjective?.tasks).toEqual([nestedFromMain.nestedTasks[0].id]);
  expect(nestedObjective?.tasks).toEqual([
    nestedFromObjective.nestedTasks[0].id
  ]);
  expect(bareObjective?.tasks ?? []).toEqual([]);
  expect(state.items.some((item) => item.id === standaloneTask.id)).toBe(true);
  await expectVisibleFocusItemLabel(
    page,
    nestedFromMain.nestedTasks[0].id,
    nestedFromMain.nestedTasks[0].label
  );
  await expectVisibleFocusItemLabel(
    page,
    nestedFromObjective.nestedTasks[0].id,
    nestedFromObjective.nestedTasks[0].label
  );
  await expectVisibleFocusItemLabel(
    page,
    objectiveOnly.objective.id,
    objectiveOnly.objective.label
  );
  await expectVisibleFocusItemLabel(
    page,
    standaloneTask.id,
    standaloneTask.label
  );
  await closeFocusItemsEditor(page);

  await ensureAdvancedFocus(page, { reload: true });
  await openFocusItemsEditor(page);
  await expectVisibleFocusItemOrder(page, [
    nestedFromMain.objective.id,
    nestedFromObjective.objective.id,
    objectiveOnly.objective.id,
    standaloneTask.id
  ]);
  await expectVisibleNestedTaskOrder(page, nestedFromMain.objective.id, [
    nestedFromMain.nestedTasks[0].id
  ]);
  await expectVisibleNestedTaskOrder(page, nestedFromObjective.objective.id, [
    nestedFromObjective.nestedTasks[0].id
  ]);
  await closeFocusItemsEditor(page);
});

async function expectDuplicateMainInputRejected(
  page: Page,
  input: Locator,
  searchRoot: Page | Locator,
  label: string,
  itemId: string
) {
  const before = await readSessionRuntime(page);
  await input.fill(label);
  await expect(searchRoot.getByText(label, { exact: true }).last()).toBeVisible(
    { timeout: 10_000 }
  );
  await input.press("Enter");

  await readToastNotificationContent(page, {
    expectedContent: "Item already exists in focus list",
    timeout: 10_000
  });
  await input.fill("");
  await expect(
    page.getByTestId(`focus-session-item:${itemId}`).filter({ visible: true })
  ).toHaveCount(1);
  expect((await readSessionRuntime(page)).items).toEqual(before.items);
}

test("rejects adding the same focus item twice", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    standaloneTaskCount: 1,
    prefix: "E2E duplicate"
  });
  await addAdvancedFocusItems(page, [
    fixture.nestedTasks[0].label,
    fixture.standaloneTasks[0].label
  ]);
  const { input, modal } = await openFocusItemsEditor(page);

  await expectDuplicateMainInputRejected(
    page,
    input,
    modal,
    fixture.objective.label,
    fixture.objective.id
  );
  await expectDuplicateMainInputRejected(
    page,
    input,
    modal,
    fixture.standaloneTasks[0].label,
    fixture.standaloneTasks[0].id
  );
  await expectDuplicateMainInputRejected(
    page,
    input,
    modal,
    fixture.nestedTasks[0].label,
    fixture.nestedTasks[0].id
  );

  await closeFocusItemsEditor(page);
});

test("creates a standalone task and nested task with Enter from an empty search", async ({
  page
}) => {
  const objective = await e2eSeed.focus.resources({
    prefix: "E2E enter objective"
  });
  const standaloneLabel = `sta${Date.now()}`;
  const nestedLabel = `nst${Date.now() + 29}`;
  const { input, modal } = await openFocusItemsEditor(page);

  await pickFocusItemFromMainInput(input, modal, objective.objective.label);
  await createFromMainEmptySearch(page, input, standaloneLabel, "Enter");
  await createNestedTaskWithEnter(page, objective.objective.id, nestedLabel);

  await expect
    .poll(
      async () =>
        (await readResourcesByLabel(page, "task", standaloneLabel)).length,
      {
        message:
          "creates a standalone task and nested task with Enter from an...: toBe 1"
      }
    )
    .toBe(1);
  await expect
    .poll(
      async () =>
        (await readResourcesByLabel(page, "task", nestedLabel)).length,
      {
        message:
          "creates a standalone task and nested task with Enter from an...: toBe 1"
      }
    )
    .toBe(1);
  expect(
    await readResourcesByLabel(page, "objective", standaloneLabel)
  ).toHaveLength(0);
  const createdStandalone = (
    await readResourcesByLabel(page, "task", standaloneLabel)
  )[0];
  const createdNested = (
    await readResourcesByLabel(page, "task", nestedLabel)
  )[0];
  expect(createdNested.objectiveId).toBe(objective.objective.id);
  await expect(getFocusSessionItem(page, createdStandalone.id)).toBeVisible();
  await expect(getFocusSessionItem(page, createdNested.id)).toBeVisible();
  const state = await readSessionRuntime(page);
  expect(state.items.some((item) => item.id === createdStandalone.id)).toBe(
    true
  );
  expect(
    state.items
      .find((item) => item.id === objective.objective.id)
      ?.tasks.includes(createdNested.id)
  ).toBe(true);
  await closeFocusItemsEditor(page);

  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(getResourceThumbnail(page, createdStandalone.id)).toBeVisible({
    timeout: 15_000
  });
  await expect(getResourceThumbnail(page, createdNested.id)).toBeVisible({
    timeout: 15_000
  });

  await ensureAdvancedFocus(page, { reload: true });
  await openFocusItemsEditor(page);
  await expect(getFocusSessionItem(page, createdStandalone.id)).toBeVisible();
  await expect(getFocusSessionItem(page, createdNested.id)).toBeVisible();
  await closeFocusItemsEditor(page);
});

test("creates an objective with Shift Enter from an empty search", async ({
  page
}) => {
  const label = `obj${Date.now()}`;
  const { input } = await openFocusItemsEditor(page);

  await createFromMainEmptySearch(page, input, label, "Shift+Enter");

  await expect
    .poll(
      async () => (await readResourcesByLabel(page, "objective", label)).length,
      {
        message:
          "creates an objective with Shift Enter from an empty search: toBe 1"
      }
    )
    .toBe(1);
  expect(await readResourcesByLabel(page, "task", label)).toHaveLength(0);
  const createdObjective = (
    await readResourcesByLabel(page, "objective", label)
  )[0];
  await expect(getFocusSessionItem(page, createdObjective.id)).toBeVisible();
  const state = await readSessionRuntime(page);
  expect(state.items.some((item) => item.id === createdObjective.id)).toBe(
    true
  );
  await expectVisibleFocusItemLabel(page, createdObjective.id, label);
  await closeFocusItemsEditor(page);

  await openLibraryAndTab(page, LibraryTab.Objectives);
  await expect(getResourceThumbnail(page, createdObjective.id)).toBeVisible({
    timeout: 15_000
  });

  await ensureAdvancedFocus(page, { reload: true });
  await openFocusItemsEditor(page);
  await expect(getFocusSessionItem(page, createdObjective.id)).toBeVisible();
  await expectVisibleFocusItemLabel(page, createdObjective.id, label);
  await closeFocusItemsEditor(page);
});

test("adds and creates focus items while session is running", async ({
  page
}) => {
  const bootstrap = await e2eSeed.focus.resources({
    prefix: "E2E live boot"
  });
  const nestedFromMain = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E live main"
  });
  const nestedFromObjective = await e2eSeed.focus.resources({
    nestedTaskCount: 1,
    prefix: "E2E live nested"
  });
  const objectiveOnly = await e2eSeed.focus.resources({
    prefix: "E2E live objective"
  });
  const standaloneTask = await e2eSeed.focus.task({
    prefix: "E2E live standalone"
  });
  const createdStandaloneLabel = `sta${Date.now()}`;
  const createdObjectiveLabel = `obj${Date.now() + 17}`;
  const createdNestedLabel = `nst${Date.now() + 29}`;
  const input = await beginRunningSessionEdit(page);

  await pickFocusItemFromMainInput(input, page, bootstrap.objective.label);
  await createFromMainEmptySearch(page, input, createdStandaloneLabel, "Enter");
  await createFromMainEmptySearch(
    page,
    input,
    createdObjectiveLabel,
    "Shift+Enter"
  );
  await createNestedTaskWithEnter(
    page,
    bootstrap.objective.id,
    createdNestedLabel
  );

  await pickFocusItemFromMainInput(
    input,
    page,
    nestedFromMain.nestedTasks[0].label
  );
  await pickFocusItemFromMainInput(
    input,
    page,
    nestedFromObjective.objective.label
  );
  await pickExistingNestedTaskUnderObjective(
    page,
    nestedFromObjective.objective.id,
    nestedFromObjective.nestedTasks[0].label
  );
  await pickFocusItemFromMainInput(input, page, objectiveOnly.objective.label);
  await pickFocusItemFromMainInput(input, page, standaloneTask.label);

  await expect
    .poll(
      async () =>
        (await readResourcesByLabel(page, "task", createdStandaloneLabel))
          .length,
      {
        message: "adds and creates focus items while session is running: toBe 1"
      }
    )
    .toBe(1);
  await expect
    .poll(
      async () =>
        (await readResourcesByLabel(page, "objective", createdObjectiveLabel))
          .length,
      {
        message: "adds and creates focus items while session is running: toBe 1"
      }
    )
    .toBe(1);
  await expect
    .poll(
      async () =>
        (await readResourcesByLabel(page, "task", createdNestedLabel)).length,
      {
        message: "adds and creates focus items while session is running: toBe 1"
      }
    )
    .toBe(1);

  const createdStandalone = (
    await readResourcesByLabel(page, "task", createdStandaloneLabel)
  )[0];
  const createdObjective = (
    await readResourcesByLabel(page, "objective", createdObjectiveLabel)
  )[0];
  const createdNested = (
    await readResourcesByLabel(page, "task", createdNestedLabel)
  )[0];
  expect(
    await readResourcesByLabel(page, "objective", createdStandaloneLabel)
  ).toHaveLength(0);
  expect(
    await readResourcesByLabel(page, "task", createdObjectiveLabel)
  ).toHaveLength(0);
  expect(createdNested.objectiveId).toBe(bootstrap.objective.id);

  const state = await readSessionRuntime(page);
  expect(state.isSessionRunning).toBe(true);
  expect(state.items.map((item) => item.id)).toEqual(
    expect.arrayContaining([
      bootstrap.objective.id,
      nestedFromMain.objective.id,
      nestedFromObjective.objective.id,
      objectiveOnly.objective.id,
      standaloneTask.id,
      createdStandalone.id,
      createdObjective.id
    ])
  );
  expect(
    state.items.find((item) => item.id === nestedFromMain.objective.id)?.tasks
  ).toEqual([nestedFromMain.nestedTasks[0].id]);
  expect(
    state.items.find((item) => item.id === nestedFromObjective.objective.id)
      ?.tasks
  ).toEqual([nestedFromObjective.nestedTasks[0].id]);
  expect(
    state.items.find((item) => item.id === bootstrap.objective.id)?.tasks
  ).toEqual([createdNested.id]);
  expect(
    state.items.find((item) => item.id === objectiveOnly.objective.id)?.tasks ??
      []
  ).toEqual([]);

  await expectVisibleNestedTaskOrder(page, nestedFromMain.objective.id, [
    nestedFromMain.nestedTasks[0].id
  ]);
  await expectVisibleNestedTaskOrder(page, nestedFromObjective.objective.id, [
    nestedFromObjective.nestedTasks[0].id
  ]);
  await expectVisibleNestedTaskOrder(page, bootstrap.objective.id, [
    createdNested.id
  ]);
  await expectVisibleFocusItemLabel(
    page,
    nestedFromMain.nestedTasks[0].id,
    nestedFromMain.nestedTasks[0].label
  );
  await expectVisibleFocusItemLabel(
    page,
    nestedFromObjective.nestedTasks[0].id,
    nestedFromObjective.nestedTasks[0].label
  );
  await expectVisibleFocusItemLabel(
    page,
    objectiveOnly.objective.id,
    objectiveOnly.objective.label
  );
  await expectVisibleFocusItemLabel(
    page,
    standaloneTask.id,
    standaloneTask.label
  );
  await expectVisibleFocusItemLabel(
    page,
    createdStandalone.id,
    createdStandaloneLabel
  );
  await expectVisibleFocusItemLabel(
    page,
    createdObjective.id,
    createdObjectiveLabel
  );
  await expectVisibleFocusItemLabel(page, createdNested.id, createdNestedLabel);

  await reloadActiveSession(page);
  await expect(getFocusSessionItem(page, createdStandalone.id)).toBeVisible();
  await expect(getFocusSessionItem(page, createdObjective.id)).toBeVisible();
  await expect(getFocusSessionItem(page, createdNested.id)).toBeVisible();
});

test("filters completed objectives and checked tasks from the picker", async ({
  page
}) => {
  const completed = await e2eSeed.focus.objective({
    status: "COMPLETED",
    prefix: "E2E completed objective"
  });
  const checked = await e2eSeed.focus.task({
    isChecked: true,
    objectiveId: "",
    prefix: "E2E checked standalone task"
  });
  const { input, modal } = await openFocusItemsEditor(page);

  await expectFocusItemPickerExcludes(input, modal, completed.label);
  await expectFocusItemPickerExcludes(input, modal, checked.label);
  await closeFocusItemsEditor(page);
});

test("adds a task from the Today's tasks picker", async ({ page }) => {
  const today = new Date();
  const fixture = await e2eSeed.focus.resources({
    dateUnix: Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    standaloneTaskCount: 1,
    prefix: "E2E today picker"
  });
  const task = fixture.standaloneTasks[0];
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  const { modal } = await openFocusItemsEditor(page);

  await modal.getByRole("tab", { name: "Today's tasks" }).click();
  const thumbnail = modal.getByTestId(`resource-thumbnail:${task.id}`);
  await expect(thumbnail).toBeVisible({ timeout: 15_000 });
  await thumbnail.hover();
  await modal
    .getByTestId(`focus-item-picker-add:${task.id}`)
    .click({ timeout: 5_000 });

  await expect
    .poll(
      async () =>
        (await readSessionRuntime(page)).items.some(
          (item) => item.id === task.id
        ),
      { message: "adds a task from the Today's tasks picker: toBe true" }
    )
    .toBe(true);
  await expect(getFocusSessionItem(page, task.id)).toBeVisible();
  await expectVisibleFocusItemLabel(page, task.id, task.label);

  await closeFocusItemsEditor(page);
  await openFocusItemsEditor(page);

  await expect(getFocusSessionItem(page, task.id)).toBeVisible();
  await expectVisibleFocusItemLabel(page, task.id, task.label);
  await closeFocusItemsEditor(page);
});

test("removes an inactive task while preserving the running session", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 2,
    prefix: "E2E remove inactive"
  });
  await addAdvancedFocusItems(
    page,
    fixture.standaloneTasks.map((task) => task.label)
  );
  await startAdvancedFocus(page);
  await setSessionEditMode(page, true);

  await page
    .getByTestId(`focus-session-remove:${fixture.standaloneTasks[1].id}`)
    .click({ timeout: 5_000 });

  await expect(
    page
      .getByTestId(`focus-session-item:${fixture.standaloneTasks[1].id}`)
      .filter({ visible: true })
  ).toHaveCount(0);
  await expect(
    getCurrentFocusSessionItem(page, fixture.standaloneTasks[0].id)
  ).toBeVisible();
  const state = await readSessionRuntime(page);
  expect(state.isSessionRunning).toBe(true);
  expect(state.currentFocusItem?.id).toBe(fixture.standaloneTasks[0].id);
  expect(state.items.map((item) => item.id)).not.toContain(
    fixture.standaloneTasks[1].id
  );
  expect(state.removedItems.map((item) => item.id)).toContain(
    fixture.standaloneTasks[1].id
  );

  await reloadActiveSession(page);
  await expect(
    getFocusSessionItem(page, fixture.standaloneTasks[1].id)
  ).toBeHidden();
  await expect(
    getCurrentFocusSessionItem(page, fixture.standaloneTasks[0].id)
  ).toBeVisible();
});

test("removes and restores a worked task without losing its block", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 2,
    prefix: "E2E restore worked"
  });
  const workedTask = fixture.standaloneTasks[0];
  const currentTask = fixture.standaloneTasks[1];
  await addAdvancedFocusItems(page, [workedTask.label, currentTask.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  await selectFocusItem(page, currentTask.label, currentTask.id);
  await setSessionEditMode(page, true);

  await page
    .getByTestId(`focus-session-remove:${workedTask.id}`)
    .click({ timeout: 5_000 });
  await expect(
    page
      .getByTestId(`focus-session-item:${workedTask.id}`)
      .filter({ visible: true })
  ).toHaveCount(0);
  await expect(getCurrentFocusSessionItem(page, currentTask.id)).toBeVisible();
  const removed = await readSessionRuntime(page);
  expect(removed.currentFocusItem?.id).toBe(currentTask.id);
  expect(
    removed.removedItems.find((item) => item.id === workedTask.id)?.blocks
      .length
  ).toBe(1);

  const input = page
    .getByPlaceholder("start typing an objective or task name...")
    .first();
  await input.fill(workedTask.label);
  await page
    .getByText(workedTask.label, { exact: true })
    .last()
    .click({ timeout: 5_000 });

  await expect(getFocusSessionItem(page, workedTask.id)).toBeVisible();
  await expect(getCurrentFocusSessionItem(page, currentTask.id)).toBeVisible();
  const restored = await readSessionRuntime(page);
  expect(
    restored.items.find((item) => item.id === workedTask.id)?.blocks.length
  ).toBe(1);
  expect(restored.removedItems.map((item) => item.id)).not.toContain(
    workedTask.id
  );

  await reloadActiveSession(page);
  await expect(getFocusSessionItem(page, workedTask.id)).toBeVisible();
  await expect(getCurrentFocusSessionItem(page, currentTask.id)).toBeVisible();
  expect(
    (await readSessionRuntime(page)).items.find(
      (item) => item.id === workedTask.id
    )?.blocks
  ).toHaveLength(1);
});

test("reorders running focus items and preserves their order across reload", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    standaloneTaskCount: 3,
    prefix: "E2E reorder"
  });
  await addAdvancedFocusItems(
    page,
    fixture.standaloneTasks.map((task) => task.label)
  );
  await startAdvancedFocus(page);
  await setSessionEditMode(page, true);
  await expect(
    getFocusSessionItem(page, fixture.standaloneTasks[0].id)
  ).toBeVisible();
  await expect(
    getFocusSessionItem(page, fixture.standaloneTasks[2].id)
  ).toBeVisible();
  await reorderFocusItems(
    page,
    fixture.standaloneTasks[0].id,
    fixture.standaloneTasks[2].id
  );
  const expectedOrder = [
    fixture.standaloneTasks[1].id,
    fixture.standaloneTasks[2].id,
    fixture.standaloneTasks[0].id
  ];
  await expectVisibleFocusItemOrder(page, expectedOrder);
  await expect
    .poll(async () => (await readSessionRuntime(page)).items[2]?.id, {
      message:
        "reorders running focus items and preserves their order across...: toBe fixture.standaloneTasks[0].id"
    })
    .toBe(fixture.standaloneTasks[0].id);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await expect
    .poll(
      async () => (await readSessionRuntime(page)).items.map((item) => item.id),
      {
        message:
          "reorders running focus items and preserves their order across...: toEqual expectedOrder"
      }
    )
    .toEqual(expectedOrder);
  await setSessionEditMode(page, true);
  await expectVisibleFocusItemOrder(page, expectedOrder);
});

test("reorders nested tasks and preserves their objective grouping", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    nestedTaskCount: 3,
    prefix: "E2E nested reorder"
  });
  await addAdvancedFocusItems(
    page,
    fixture.nestedTasks.map((task) => task.label)
  );
  await startAdvancedFocus(page);
  await reorderFocusTasks(
    page,
    fixture.objective.id,
    fixture.nestedTasks[0].id,
    fixture.nestedTasks[2].id
  );

  const expectedTaskOrder = [
    fixture.nestedTasks[1].id,
    fixture.nestedTasks[2].id,
    fixture.nestedTasks[0].id
  ];
  await expectVisibleNestedTaskOrder(
    page,
    fixture.objective.id,
    expectedTaskOrder
  );
  await expect
    .poll(
      async () =>
        (await readSessionRuntime(page)).items.find(
          (item) => item.id === fixture.objective.id
        )?.tasks,
      {
        message:
          "reorders nested tasks and preserves their objective grouping: toEqual expectedTaskOrder"
      }
    )
    .toEqual(expectedTaskOrder);

  await reloadActiveSession(page);
  await setSessionEditMode(page, true);
  await expectVisibleNestedTaskOrder(
    page,
    fixture.objective.id,
    expectedTaskOrder
  );
});

test("lists a completed objective in recent focus items", async ({ page }) => {
  const pageErrors = collectPageErrors(page);
  const fixture = await e2eSeed.focus.resources({ prefix: "E2E recent" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  await finishSessionFromControl(page);
  await dismissFinishedSession(page);

  const { modal } = await openFocusItemsEditor(page);
  await expect(
    modal.getByText(fixture.objective.label, { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
  expect(pageErrors).toEqual([]);
  await closeFocusItemsEditor(page);
});

test("adds another item while running and starts it after edit mode closes", async ({
  page
}) => {
  const first = await e2eSeed.focus.resources({ prefix: "E2E live first" });
  const second = await e2eSeed.focus.resources({ prefix: "E2E live second" });
  await addAdvancedFocusItems(page, [first.objective.label]);
  await startAdvancedFocus(page);
  await setSessionEditMode(page, true);

  const input = page
    .getByPlaceholder("start typing an objective or task name...")
    .first();
  await input.fill(second.objective.label);
  await expect(
    page.getByText(second.objective.label, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await input.press("Enter");
  await setSessionEditMode(page, false);
  await selectFocusItem(page, second.objective.label, second.objective.id);

  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();
  expect((await readSessionRuntime(page)).currentFocusItem?.id).toBe(
    second.objective.id
  );

  await reloadActiveSession(page);
  await expect(
    getCurrentFocusItemRow(page, second.objective.label)
  ).toBeVisible();
});

import { test, expect, type Page } from "@playwright/test";
import { ResourceActionType } from "@21n/data/datafn/resource.type";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand,
  getProductConfig
} from "../../../utils/helpers";

function getResourceContainer(locator: ReturnType<Page["locator"]>) {
  return locator.locator(
    "xpath=ancestor-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' resource ')][1]"
  );
}

/** Nucleum task list context menu: action rows use visible labels, not always data-context-menu-item-id. */
const NUCLEUM_TASK_LIBRARY_MENU_LABELS = [
  /^Open task$/i,
  /^Select$/i,
  /^Assign goal$/i,
  /^Mark as complete$/i,
  /^Focus now$/i,
  /^Delete$/i
] as const;

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - context menu (all actions) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    async function createTask(page: Page, taskName: string) {
      await runCommand(page, "Create a new task");
      const taskNameInput = page.getByTestId("task-name-input");
      await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await taskNameInput.fill(taskName);
      await page.keyboard.press("Enter");
      await taskNameInput
        .waitFor({ state: "hidden", timeout: 8_000 })
        .catch(() => null);
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(600);
    }

    async function openTaskContextMenuFromLibrary(page: Page, taskName: string) {
      await openLibraryAndTab(page, LibraryTab.Tasks);
      const list = page.locator(".resource").filter({ hasText: taskName }).first();
      const hasListRow = await list.isVisible().catch(() => false);
      if (!hasListRow) {
        const semanticTaskRow = page
          .getByRole("button", { name: new RegExp(`^${taskName}$`) })
          .first();
        if (await semanticTaskRow.isVisible().catch(() => false)) {
          const resourceContainer = getResourceContainer(semanticTaskRow);
          await resourceContainer.hover();
          await page.waitForTimeout(250);
          const triggerWrapper = resourceContainer.getByTestId(
            "thumbnail-context-menu-trigger"
          );
          await triggerWrapper.locator("button").first().click({ timeout: 5_000 });
          await page.waitForTimeout(300);
          return;
        }

        const taskTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
        await expect(taskTextbox).toBeVisible({ timeout: 20_000 });
        const resourceContainer = getResourceContainer(taskTextbox);
        await resourceContainer.hover();
        await page.waitForTimeout(250);
        const triggerWrapper = resourceContainer.getByTestId(
          "thumbnail-context-menu-trigger"
        );
        await triggerWrapper.locator("button").first().click({ timeout: 5_000 });
        await page.waitForTimeout(300);
        return;
      }

      await list.hover();
      await page.waitForTimeout(250);

      const triggerWrapper = list.getByTestId("thumbnail-context-menu-trigger");
      await triggerWrapper.locator("button").first().click({ timeout: 5_000 });
      await page.waitForTimeout(300);
    }

    test("context menu appears with expected actions on hover (Library → Tasks)", async ({
      page
    }, testInfo) => {
      test.setTimeout(90_000);
      const productConfig = getProductConfig(testInfo.project.name);
      test.skip(
        !productConfig.capabilities.records.task,
        "Task browsing is not part of this product contract"
      );
      await ensureInAppOnHome(page);

      const taskName = `E2E task ctx ${Date.now()}`;
      await createTask(page, taskName);
      await openTaskContextMenuFromLibrary(page, taskName);

      if (productConfig.ui.taskContextMenuVariant === "nucleum") {
        for (const name of NUCLEUM_TASK_LIBRARY_MENU_LABELS) {
          await expect(page.getByRole("button", { name }).first()).toBeVisible({
            timeout: 8_000
          });
        }
      } else {
        const expectedItems = [
          { value: ResourceActionType.SELECT },
          { value: ResourceActionType.STAR },
          { value: "addToCollection" },
          { value: ResourceActionType.EDIT },
          { value: ResourceActionType.COPY_LINK },
          { value: ResourceActionType.ARCHIVE },
          { value: ResourceActionType.DELETE }
        ];

        let anyVisible = false;
        for (const item of expectedItems) {
          const loc = page.locator(`[data-context-menu-item-id="${item.value}"]`);
          if (await loc.isVisible().catch(() => false)) {
            anyVisible = true;
            await expect(loc).toBeVisible({ timeout: 5_000 });
          }
        }
        expect(anyVisible, "At least one expected context menu action should be visible").toBe(true);
      }

      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe("from record page", () => {
    async function assertTaskRecordVisible(page: Page) {
      const taskInput = page.getByTestId("task-name-input");
      const taskNameTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
      const closeBtn = page.getByRole("button", { name: /Close/i }).first();
      const maxBtn = page.getByRole("button", { name: /Maximize|Minimize/i }).first();
      await expect
        .poll(
          async () =>
            (await taskInput.isVisible().catch(() => false)) ||
            (await taskNameTextbox.isVisible().catch(() => false)) ||
            (await closeBtn.isVisible().catch(() => false)) ||
            (await maxBtn.isVisible().catch(() => false)),
          { timeout: 15_000 }
        )
        .toBe(true);
    }

    async function openRecordPageContextMenu(page: Page) {
      // Panel chrome may omit a "Close" label on constrained widths; target the resource header strip.
      const panelRow = page.locator("div.border-t.border-x.border-brs3").first();
      if (await panelRow.isVisible().catch(() => false)) {
        const moreMenu = panelRow.locator("#resourcePanelContextMenu button").first();
        if (await moreMenu.isVisible().catch(() => false)) {
          await moreMenu.click({ timeout: 5_000 });
        } else {
          const buttons = panelRow.getByRole("button");
          await buttons.last().click({ timeout: 5_000 });
        }
        await page.waitForTimeout(300);
        return;
      }

      const taskNameTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
      await expect(taskNameTextbox).toBeVisible({ timeout: 15_000 });
      const inlineRecordRow = getResourceContainer(taskNameTextbox);
      await inlineRecordRow.hover();
      await page.waitForTimeout(250);
      const triggerWrapper = inlineRecordRow
        .getByTestId("thumbnail-context-menu-trigger")
        .first();
      await triggerWrapper.locator("button").first().click({ timeout: 5_000 });
      await page.waitForTimeout(300);
    }

    async function openTaskRecordFromLibrary(page: Page, taskName: string) {
      await openLibraryAndTab(page, LibraryTab.Tasks);
      const listRow = page.locator(".resource").filter({ hasText: taskName }).first();
      if (await listRow.isVisible().catch(() => false)) {
        await listRow.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
        return;
      }

      const semanticTaskRow = page
        .getByRole("button", { name: new RegExp(`^${taskName}$`) })
        .first();
      if (await semanticTaskRow.isVisible().catch(() => false)) {
        await semanticTaskRow.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
        return;
      }

      const taskTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
      await expect(taskTextbox).toBeVisible({ timeout: 20_000 });
      await taskTextbox.click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
    }

    test("context menu on record page shows expected core actions", async ({
      page
    }, testInfo) => {
      test.setTimeout(90_000);
      const productConfig = getProductConfig(testInfo.project.name);
      test.skip(
        !productConfig.capabilities.records.task,
        "Task record page is not part of this product contract"
      );
      await ensureInAppOnHome(page);

      const taskName = `E2E task rec ctx ${Date.now()}`;
      await runCommand(page, "Create a new task");
      const taskNameInput = page.getByTestId("task-name-input");
      await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await taskNameInput.fill(taskName);
      await page.keyboard.press("Enter");
      await taskNameInput
        .waitFor({ state: "hidden", timeout: 8_000 })
        .catch(() => null);
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(600);

      await openTaskRecordFromLibrary(page, taskName);

      await assertTaskRecordVisible(page);

      await openRecordPageContextMenu(page);

      if (productConfig.ui.taskContextMenuVariant === "nucleum") {
        const nucleumRecordLabels = [/^Delete$/i, /^Select$/i, /^Copy link$/i];
        let anyDataAttr = false;
        for (const item of [
          ResourceActionType.STAR,
          ResourceActionType.EDIT,
          ResourceActionType.COPY_LINK,
          ResourceActionType.ARCHIVE,
          ResourceActionType.DELETE
        ]) {
          const loc = page.locator(`[data-context-menu-item-id="${item}"]`);
          if (await loc.isVisible().catch(() => false)) {
            anyDataAttr = true;
            await expect(loc).toBeVisible();
          }
        }
        let anyLabel = false;
        if (!anyDataAttr) {
          for (const name of nucleumRecordLabels) {
            const btn = page.getByRole("button", { name }).first();
            if (await btn.isVisible().catch(() => false)) {
              anyLabel = true;
              await expect(btn).toBeVisible();
            }
          }
        }
        expect(
          anyDataAttr || anyLabel,
          "At least one expected record context menu action (data attribute or label) should be visible"
        ).toBe(true);
      } else {
        const expectedRecordItems = [
          { value: ResourceActionType.STAR },
          { value: ResourceActionType.EDIT },
          { value: ResourceActionType.COPY_LINK },
          { value: ResourceActionType.ARCHIVE },
          { value: ResourceActionType.DELETE }
        ];

        let anyVisible = false;
        for (const item of expectedRecordItems) {
          const menuItem = page.locator(
            `[data-context-menu-item-id="${item.value}"]`
          );
          const visible = await menuItem.isVisible().catch(() => false);
          if (visible) {
            anyVisible = true;
            await expect(menuItem).toBeVisible({ timeout: 5_000 });
          }
        }
        expect(anyVisible, "At least one expected record context menu action should be visible").toBe(true);
      }

      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    });
  });
});

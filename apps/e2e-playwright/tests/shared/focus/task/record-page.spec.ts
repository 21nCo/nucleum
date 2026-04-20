import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand,
  getProductConfig
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - record page (opening flows, visibility, tab switching) @regression @feature @focus-feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function createTask(page: import("@playwright/test").Page, taskName: string) {
    await runCommand(page, "Create a new task");
    const taskNameInput = page.getByTestId("task-name-input");
    await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await taskNameInput.fill(taskName);
    await page.keyboard.press("Enter");
    await taskNameInput.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(600);
  }

  async function openTaskRecordFromLibrary(
    page: import("@playwright/test").Page,
    taskName: string
  ) {
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

  async function assertTaskRecordVisible(page: import("@playwright/test").Page) {
    const taskInput = page.getByTestId("task-name-input");
    const taskNameTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
    const closeBtn = page.getByRole("button", { name: /Close/i }).first();
    const maxBtn = page.getByRole("button", { name: /Maximize|Minimize/i }).first();
    const resourcePanel = page.locator("[data-panel-type], .border-t.border-x.border-brs3").first();
    await expect
      .poll(
        async () =>
          (await taskInput.isVisible().catch(() => false)) ||
          (await taskNameTextbox.isVisible().catch(() => false)) ||
          (await closeBtn.isVisible().catch(() => false)) ||
          (await maxBtn.isVisible().catch(() => false)) ||
          (await resourcePanel.isVisible().catch(() => false)),
        { timeout: 25_000 }
      )
      .toBe(true);
  }

  test("open task record page and assert panels/expected content visible", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.task,
      "Task record page is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const taskName = `E2E task record ${Date.now()}`;
    await createTask(page, taskName);
    await openTaskRecordFromLibrary(page, taskName);

    await assertTaskRecordVisible(page);
    await expectTaskRecordContent(page, "Info", taskName);
  });

  test("tab switching and visibility check on task record page", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.task ||
        !productConfig.capabilities.records.taskTabs,
      "Task record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const taskName = `E2E task tabs ${Date.now()}`;
    await createTask(page, taskName);
    await openTaskRecordFromLibrary(page, taskName);

    const tabList = page.getByRole("tablist").first();
    await expect(tabList).toBeVisible({ timeout: 10_000 });

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      const label = (await tab.textContent())?.trim() ?? "";
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
      await expectTaskRecordContent(page, label, taskName);
    }
  });
});

async function expectTaskRecordContent(
  page: import("@playwright/test").Page,
  tabLabel: string,
  taskName: string
) {
  const lowerLabel = tabLabel.toLowerCase();
  if (lowerLabel.includes("info")) {
    const infoAnchors = [
      page.getByTestId("task-name-input"),
      page.getByRole("textbox", { name: /Task name/i }).first(),
      page.getByRole("heading", { name: new RegExp(`^${taskName}$`) }).first(),
      page.getByText(/Created:/i).first(),
      page.getByText(/Status/i).first(),
      page.getByText(taskName).first()
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
  if (lowerLabel.includes("activity")) {
    await expect
      .poll(
        async () =>
          (await page.getByText(/History|Activity|All/i).first().isVisible().catch(() => false)) ||
          (await page.getByText(/No data available/i).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);
    return;
  }
  await expectTaskRecordVisible(page);
}

async function expectTaskRecordVisible(page: import("@playwright/test").Page) {
  const taskInput = page.getByTestId("task-name-input");
  const taskNameTextbox = page.getByRole("textbox", { name: /Task name/i }).first();
  const closeBtn = page.getByRole("button", { name: /Close/i }).first();
  const maxBtn = page.getByRole("button", { name: /Maximize|Minimize/i }).first();
  const resourcePanel = page.locator("[data-panel-type], .border-t.border-x.border-brs3").first();
  await expect
    .poll(
      async () =>
        (await taskInput.isVisible().catch(() => false)) ||
        (await taskNameTextbox.isVisible().catch(() => false)) ||
        (await closeBtn.isVisible().catch(() => false)) ||
        (await maxBtn.isVisible().catch(() => false)) ||
        (await resourcePanel.isVisible().catch(() => false)),
      { timeout: 25_000 }
    )
    .toBe(true);
}

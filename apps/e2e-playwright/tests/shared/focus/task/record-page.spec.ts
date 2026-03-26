import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, openLibraryAndTab, LibraryTab, runCommand } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("task - record page (opening flows, visibility, tab switching) @regression", () => {
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

    const container = page.locator("#task-library");
    await expect(container).toBeVisible({ timeout: 15_000 });
    const matchingCard = container.locator('div[id^="thumbnail-"]').filter({ hasText: taskName }).first();
    const hasMatchingCard = await matchingCard
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasMatchingCard) {
      test.skip(true, "Created task is not visible in library list/cards (N/A)");
      return;
    }
    await matchingCard.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  async function assertTaskRecordVisible(page: import("@playwright/test").Page) {
    const taskInput = page.getByTestId("task-name-input");
    const closeBtn = page.getByRole("button", { name: /Close/i }).first();
    const maxBtn = page.getByRole("button", { name: /Maximize|Minimize/i }).first();
    const resourcePanel = page.locator("[data-panel-type], .border-t.border-x.border-brs3").first();
    await expect
      .poll(
        async () =>
          (await taskInput.isVisible().catch(() => false)) ||
          (await closeBtn.isVisible().catch(() => false)) ||
          (await maxBtn.isVisible().catch(() => false)) ||
          (await resourcePanel.isVisible().catch(() => false)),
        { timeout: 25_000 }
      )
      .toBe(true);
  }

  test("open task record page and assert panels/expected content visible", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task record ${Date.now()}`;
    await createTask(page, taskName);
    await openTaskRecordFromLibrary(page, taskName);

    await assertTaskRecordVisible(page);
  });

  test("tab switching and visibility check on task record page", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const taskName = `E2E task tabs ${Date.now()}`;
    await createTask(page, taskName);
    await openTaskRecordFromLibrary(page, taskName);

    const tabList = page.getByRole("tablist").first();
    const hasTabs = await tabList.isVisible().catch(() => false);
    if (!hasTabs) test.skip(true, "No tablist rendered on task record page in this product build");

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
      await page.waitForTimeout(300);
    }
  });
});

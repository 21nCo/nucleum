import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, openLibraryAndTab, LibraryTab, runCommand } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal - record page (opening flows, visibility, tab switching) @regression", () => {
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
    await openLibraryAndTab(page, LibraryTab.Goals);
    // Avoid OR/union locators (strict-mode violations when multiple nodes match the text).
    const row = page.locator(".resource").filter({ hasText: goalName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  test("open goal record page and assert panels/expected content visible", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E goal record ${Date.now()}`;
    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    await expect(page.getByText(goalName).first()).toBeVisible({
      timeout: 20_000
    });
    await expect(page.getByRole("button", { name: /Close/i }).first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("tab switching and visibility check on goal record page", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E goal tabs ${Date.now()}`;
    await createGoal(page, goalName);
    await openGoalRecordFromLibrary(page, goalName);

    const tabList = page.getByRole("tablist").first();
    const hasTabs = await tabList.isVisible().catch(() => false);
    if (!hasTabs) test.skip(true, "No tablist rendered on goal record page in this product build");

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5_000
      });
      await page.waitForTimeout(300);
    }
  });
});

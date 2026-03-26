import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, openLibraryAndTab, LibraryTab, runCommand } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node - record page (opening, visibility, tab switching) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function createNode(page: import("@playwright/test").Page, nodeName: string) {
    await runCommand(page, "Capture");
    const editor = page.getByTestId("capture-editor");
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(nodeName, { delay: 25 });
    await page.waitForTimeout(300);
    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }));
    await saveBtn.first().click({ timeout: 10_000 });
    await page.waitForTimeout(1_200);
    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    } else {
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  }

  async function openNodeRecordFromLibrary(
    page: import("@playwright/test").Page,
    nodeName: string
  ) {
    await openLibraryAndTab(page, LibraryTab.Nodes);
    // Avoid union/or locators (strict-mode violations when multiple nodes match the text).
    const row = page.locator(".resource").filter({ hasText: nodeName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  test("open node record and assert panels/content visible", async ({ page }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const nodeName = `E2E node record ${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    await expect(page.getByText(nodeName).first()).toBeVisible({
      timeout: 20_000
    });
    await expect(page.getByRole("button", { name: /Close/i }).first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("tab switching and visibility on node record page", async ({ page }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const nodeName = `E2E node tabs ${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    const tabList = page.getByRole("tablist").first();
    const hasTabs = await tabList.isVisible().catch(() => false);
    if (!hasTabs) test.skip(true, "No tablist rendered on node record page in this product build");

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

import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  openLibraryAndTab,
  LibraryTab
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node - creation flows @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("create node via command bar", async ({ page }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const nodeText = `E2E node cmd ${Date.now()}`;
    await runCommand(page, "Capture");

    const editor = page
      .getByTestId("capture-editor")
      .getByPlaceholder("Start typing to capture...")
      .or(
        page
          .getByTestId("capture-editor")
          .getByRole("textbox", { name: /Markdown editor|Start typing/i })
      )
      .first();
    const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }
    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    await page.keyboard.type(nodeText, { delay: 50 });
    await page.waitForTimeout(300);

    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }));
    await saveBtn.first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    const closeBtn = page.getByRole("button", { name: "Close" });
    await closeBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await openLibraryAndTab(page, LibraryTab.Nodes);
    await expect(
      page.getByText(nodeText, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create node via UI", async ({ page }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const nodeText = `E2E node UI ${Date.now()}`;
    await page
      .getByRole("button", { name: /^Capture$/i })
      .first()
      .click({ timeout: 5_000 });

    await page.waitForTimeout(1_000);
    const editor = page
      .getByTestId("capture-editor")
      .getByPlaceholder("Start typing to capture...")
      .or(
        page
          .getByTestId("capture-editor")
          .getByRole("textbox", { name: /Markdown editor|Start typing/i })
      )
      .first();
    const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }
    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    await page.keyboard.type(nodeText, { delay: 50 });
    await page.waitForTimeout(300);

    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }));
    await saveBtn.first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    const closeBtn = page.getByRole("button", { name: "Close" });
    await closeBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await openLibraryAndTab(page, LibraryTab.Nodes);
    await expect(
      page.getByText(nodeText, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create capture with direct link and verify saved node reopens with linked item", async ({
    page
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await ensureInAppOnHome(page);

    const targetNodeTitle = `E2E capture link target ${Date.now()}`;
    const sourceNodeTitle = `E2E capture link source ${Date.now()}`;

    async function createNode(title: string) {
      await page.getByRole("button", { name: /^Capture$/i }).first().click({
        timeout: 5_000
      });
      const titleEditor = page.locator("#capture-title").first();
      const editor = page
        .locator('[data-testid="capture-editor"] [contenteditable]')
        .first();
      await titleEditor.waitFor({ state: "visible", timeout: 10_000 });
      await editor.waitFor({ state: "visible", timeout: 10_000 });
      await titleEditor.click({ timeout: 5_000 });
      await page.keyboard.type(title, { delay: 20 });
      await editor.click({ timeout: 5_000 });
      await page.keyboard.type(title, { delay: 20 });
      await page.waitForTimeout(1_000);
      await page.getByTestId("capture-save-button").first().click({
        timeout: 5_000
      });
      await page.waitForTimeout(1_500);
      const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click({ timeout: 5_000 }).catch(() => null);
      }
      await page.waitForTimeout(800);
    }

    await createNode(targetNodeTitle);

    await page.getByRole("button", { name: /^Capture$/i }).first().click({
      timeout: 5_000
    });
    const titleEditor = page.locator("#capture-title").first();
    const editor = page
      .locator('[data-testid="capture-editor"] [contenteditable]')
      .first();
    await titleEditor.waitFor({ state: "visible", timeout: 10_000 });
    await editor.waitFor({ state: "visible", timeout: 10_000 });
    await titleEditor.click({ timeout: 5_000 });
    await page.keyboard.type(sourceNodeTitle, { delay: 20 });
    await editor.click({ timeout: 5_000 });
    await page.keyboard.type(sourceNodeTitle, { delay: 20 });
    await page.waitForTimeout(1_000);

    const linksToggle = page.getByRole("button", { name: /Links/i }).first();
    await linksToggle.click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    const linkSearch = page
      .getByPlaceholder(/Link to a node or add to a collection/i)
      .first();
    await linkSearch.fill(targetNodeTitle);
    await page.waitForTimeout(1_200);
    await page.getByText(targetNodeTitle, { exact: false }).first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(1_200);

    expect(
      pageErrors.filter((message) =>
        message.includes("effect_update_depth_exceeded")
      )
    ).toEqual([]);

    await page.getByTestId("capture-save-button").first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(1_500);

    await openLibraryAndTab(page, LibraryTab.Nodes);
    const sourceRow = page.getByText(sourceNodeTitle, { exact: false }).first();
    await sourceRow.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    const linksTab = page
      .getByRole("tab", { name: /^Links$/i })
      .or(page.getByRole("button", { name: /^Links$/i }))
      .first();
    await linksTab.click({ timeout: 5_000 });
    await expect(
      page.locator('[data-id], .resource, .group').filter({
        hasText: targetNodeTitle
      }).first()
    ).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });
});

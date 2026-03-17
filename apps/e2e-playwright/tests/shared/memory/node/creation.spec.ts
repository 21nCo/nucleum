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
});

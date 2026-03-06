import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("memory – capture @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });
  });

  test("open Capture via command bar (Capture), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Capture");

    await page.waitForTimeout(1_000);
    const editor = page
      .getByTestId("capture-editor")
      .getByPlaceholder("Start typing to capture...")
      .or(
        page
          .getByTestId("capture-editor")
          .getByRole("textbox", {
            name: /Markdown editor|Start typing/i
          })
      )
      .first();
    const markdownBtn = page
      .getByRole("button", { name: /^Markdown$/i })
      .first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    const captureText = `E2E capture ${Date.now()}`;
    await page.keyboard.type(captureText, { delay: 50 });
    await page.waitForTimeout(600);

    const saveBtn = page.getByRole("button", { name: /Save/i });
    await saveBtn.waitFor({ state: "visible", timeout: 8_000 });
    await saveBtn.click({ timeout: 5_000 });
    await expect(saveBtn).toBeHidden({ timeout: 10_000 });
  });

  test("open Capture via UI (click Capture in top bar), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

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
          .getByRole("textbox", {
            name: /Markdown editor|Start typing/i
          })
      )
      .first();
    const markdownBtn = page
      .getByRole("button", { name: /^Markdown$/i })
      .first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await editor.waitFor({ state: "visible", timeout: 8_000 });
    await editor.click();
    const captureText = `E2E capture UI ${Date.now()}`;
    await page.keyboard.type(captureText, { delay: 50 });
    await page.waitForTimeout(600);

    const saveBtn = page.getByRole("button", { name: /Save/i });
    await saveBtn.waitFor({ state: "visible", timeout: 8_000 });
    await saveBtn.click({ timeout: 5_000 });
    await expect(saveBtn).toBeHidden({ timeout: 10_000 });
  });
});

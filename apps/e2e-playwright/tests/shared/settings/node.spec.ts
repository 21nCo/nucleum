import { test, expect } from "@playwright/test";
import path from "node:path";
import { ensureInAppOnHome, getProductConfig, runCommand } from "../../utils/helpers";
import {
  openDeclaredNodeBookmarksPanel,
  openDeclaredNodeContentPanel,
  openDeclaredSettingsPanel
} from "../../utils/settings-contracts";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

const pdfFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);
const highlightedWord = "including";

async function openNodeSettings(page: import("@playwright/test").Page, projectName: string) {
  await openDeclaredSettingsPanel(page, projectName, "node");
}

async function setHideHighlightColors(
  page: import("@playwright/test").Page,
  projectName: string,
  enabled: boolean
) {
  await openNodeSettings(page, projectName);
  const toggleBtn = page.locator("button:has(input[type='checkbox'])").first();
  await expect(toggleBtn).toBeVisible({ timeout: 5_000 });
  const toggleInput = toggleBtn.locator("input[type='checkbox']");
  const isChecked = await toggleInput.isChecked().catch(() => false);
  if (isChecked !== enabled) {
    await toggleBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(500);
  }
  if (enabled) {
    await expect(toggleInput).toBeChecked({ timeout: 5_000 });
  } else {
    await expect(toggleInput).not.toBeChecked();
  }
  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
}

async function uploadPdfNode(page: import("@playwright/test").Page) {
  await runCommand(page, "Capture");
  await page.waitForTimeout(700);
  await page.locator('button[data-value="UPLOAD"]').first().click({
    timeout: 8_000
  });
  await page.locator('input[type="file"][accept*=".pdf"]').first().setInputFiles(
    pdfFixturePath
  );
}

async function openMediaContentPanel(page: import("@playwright/test").Page) {
  await openDeclaredNodeContentPanel(page, test.info().project.name);
  const viewer = page.locator("#viewerContainer");
  const visible = await viewer
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    throw new Error("E2E_SURFACE_001: PDF viewer did not appear after explicit content-panel navigation");
  }
}

test.describe("settings - node panel @regression @feature @settings-feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("Node settings panel is visible with declared controls", async ({ page }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.nodeSettingsPanel,
      "Node settings panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openNodeSettings(page, testInfo.project.name);

    await expect(page.getByText(/^Node settings$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Don't show text highlight colors").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Node settings hide/show text highlight colors affects PDF bookmarks after explicit content navigation", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.settings.nodeSettingsPanel,
      "Node settings panel is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    await setHideHighlightColors(page, testInfo.project.name, false);

    await uploadPdfNode(page);
    await openMediaContentPanel(page);

    const targetWord = page
      .locator(".textLayer span")
      .filter({ hasText: new RegExp(highlightedWord, "i") })
      .first();
    await targetWord.waitFor({ state: "visible", timeout: 20_000 });
    await targetWord.dblclick({ timeout: 5_000 });

    const inlineToolbar = page
      .locator(
        "div.material-symbols-rounded.bg-bgs2.rounded-md.border.border-brs3"
      )
      .filter({ has: page.locator("button") })
      .first();
    await expect(inlineToolbar).toBeVisible({ timeout: 8_000 });
    await inlineToolbar.locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);

    const openBookmarks = async () => {
      await openDeclaredNodeBookmarksPanel(page, testInfo.project.name);
    };

    const bookmarkHighlightStyle = async () => {
      await openBookmarks();
      const bookmarkRow = page
        .locator("button")
        .filter({ hasText: new RegExp(highlightedWord, "i") })
        .filter({ hasNot: page.getByPlaceholder("Search bookmarks") })
        .first();
      await expect(bookmarkRow).toBeVisible({ timeout: 15_000 });
      const bookmarkHighlightText = bookmarkRow.locator("span").first();
      await expect(bookmarkHighlightText).toBeVisible({ timeout: 5_000 });
      return (await bookmarkHighlightText.getAttribute("style")) ?? "";
    };

    const styleWithSettingOff = await bookmarkHighlightStyle();
    expect(styleWithSettingOff.toLowerCase()).toContain("background-color");

    await setHideHighlightColors(page, testInfo.project.name, true);
    const styleWithSettingOn = await bookmarkHighlightStyle();
    expect(styleWithSettingOn.toLowerCase()).not.toContain("background-color");

    await setHideHighlightColors(page, testInfo.project.name, false);
  });
});

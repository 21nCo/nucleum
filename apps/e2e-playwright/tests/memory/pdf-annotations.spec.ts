import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import { openDeclaredNodeBookmarksPanel } from "../utils/settings-contracts";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  openCapture,
  openNodeRecordFromLibrary
} from "./memory-test-helpers";

const pdfFixturePath = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);
const highlightedWord = "including";
const comment = "E2E PDF reading note";

/** Opens the PDF through its declared product content surface. */
async function openPdfContent(page: Page) {
  const contentTab = page.getByRole("tab", { name: "Content", exact: true });
  await expect(contentTab).toBeVisible();
  await contentTab.click();
  await expect(contentTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#viewerContainer")).toBeVisible({
    timeout: 60_000
  });
}

/** Selects a word through PDF.js's text layer and exposes annotation actions. */
async function selectPdfWord(page: Page, word: string) {
  const text = page
    .locator('.page[data-page-number="1"] .textLayer span')
    .filter({ hasText: new RegExp(`\\b${word}\\b`, "i") })
    .first();
  await expect(text).toBeVisible({ timeout: 30_000 });
  await text.dblclick();
  const toolbar = page.locator('[data-pdf-annotation-overlay][role="toolbar"]');
  await expect(toolbar).toBeVisible();
  return toolbar;
}

/** Uploads a distinct PDF and asserts both annotations before any reopening. */
async function captureAnnotatedPdf(page: Page) {
  await blockExternalAuthRequests(page);
  await ensureInAppOnHome(page);
  const fileName = `E2E PDF annotations ${randomUUID()}.pdf`;
  await openCapture(page, "ui");
  await page.locator('button[data-value="UPLOAD"]').first().click();
  await page
    .locator('input[type="file"][accept*=".pdf"]')
    .first()
    .setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: await readFile(pdfFixturePath)
    });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 30_000
  });
  await expect(
    page.getByRole("button", { name: fileName, exact: true })
  ).toBeVisible();
  await openPdfContent(page);

  const toolbar = await selectPdfWord(page, highlightedWord);
  await toolbar.getByRole("button").nth(0).click();
  const highlight = page
    .locator('.page[data-page-number="1"] [data-annottype="HIGHLIGHT"]')
    .first();
  await expect(highlight).toBeVisible();
  await expect(highlight).toBeInViewport();

  const commentToolbar = await selectPdfWord(page, "Lorem");
  await commentToolbar.getByRole("button").nth(3).click();
  const editor = page.getByPlaceholder("Enter your comment");
  await expect(editor).toBeVisible();
  await editor.fill(comment);
  await page
    .locator("[data-pdf-annotation-overlay]")
    .filter({ has: editor })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(editor).toBeHidden();

  await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
  await expect(
    page.getByRole("button").filter({ hasText: highlightedWord }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("button").filter({ hasText: comment }).first()
  ).toBeVisible();
  return fileName;
}

/** Verifies durable bookmarks and that selecting one scrolls to its PDF passage. */
async function expectRestoredAnnotations(page: Page, fileName: string) {
  await openNodeRecordFromLibrary(page, fileName);
  await openPdfContent(page);
  await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
  const bookmark = page
    .getByRole("button")
    .filter({ hasText: highlightedWord })
    .first();
  await expect(bookmark).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button").filter({ hasText: comment }).first()
  ).toBeVisible();
  const highlight = page
    .locator('.page[data-page-number="1"] [data-annottype="HIGHLIGHT"]')
    .first();
  await expect(highlight).toBeVisible();
  await page.locator("#viewerContainer").evaluate((viewer) => {
    viewer.scrollTop = viewer.scrollHeight;
  });
  await expect(highlight).not.toBeInViewport();
  await bookmark.click();
  await expect(highlight).toBeInViewport({ timeout: 15_000 });
  await expect(highlight).toHaveAttribute("data-annottype", "HIGHLIGHT");
  await expect(page.locator('.page[data-page-number="1"]')).toBeInViewport();
}

test.describe("memory - PDF annotation durability @creation", () => {
  test("offline PDF highlights and comments survive reload and bookmark navigation", async ({
    page
  }) => {
    test.skip(
      isCloudAuthModeActive(),
      "This case exercises local-only PDF persistence"
    );
    test.setTimeout(180_000);
    const fileName = await captureAnnotatedPdf(page);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await expectRestoredAnnotations(page, fileName);
  });

  test("PDF highlights and comments restore from cloud in a fresh authenticated context @auth", async ({
    page,
    browser,
    baseURL
  }) => {
    test.skip(
      !isCloudAuthModeActive(),
      "A cloud round trip needs an authenticated account and FileFn"
    );
    test.setTimeout(240_000);
    const fileName = await captureAnnotatedPdf(page);
    const { cookies } = await page.context().storageState();
    const restoredContext = await browser.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      viewport: { width: 1512, height: 982 },
      storageState: { cookies, origins: [] }
    });
    try {
      expect(
        (await restoredContext.storageState({ indexedDB: true })).origins
      ).toEqual([]);
      const restoredPage = await restoredContext.newPage();
      await blockExternalAuthRequests(restoredPage);
      await ensureInAppOnHome(restoredPage);
      await expectRestoredAnnotations(restoredPage, fileName);
    } finally {
      await restoredContext.close();
    }
  });
});

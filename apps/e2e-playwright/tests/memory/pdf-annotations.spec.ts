import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import {
  openDeclaredNodeBookmarksPanel,
  openDeclaredNodeContentPanel
} from "../utils/settings-contracts";
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
const highlightedWord = "Lorem";
const comment = "E2E PDF reading note";

/** Opens the PDF through its declared product content surface. */
async function openPdfContent(page: Page) {
  await openDeclaredNodeContentPanel(page, test.info().project.name);
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
  await text.scrollIntoViewIfNeeded();
  const point = await text.evaluate((element, word) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const index =
        node.textContent?.toLowerCase().indexOf(word.toLowerCase()) ?? -1;
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + word.length);
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    throw new Error(`PDF word not found: ${word}`);
  }, word);
  await page.mouse.dblclick(point.x, point.y);
  const toolbar = page.locator('[data-pdf-annotation-overlay][role="toolbar"]');
  await expect(toolbar).toBeVisible();
  return toolbar;
}

/** Uploads a distinct PDF through Capture and opens its content. */
async function uploadPdf(page: Page) {
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
  return fileName;
}

/** Creates a highlight and verifies its immediate bookmark feedback. */
async function captureHighlightedPdf(page: Page) {
  const fileName = await uploadPdf(page);
  const toolbar = await selectPdfWord(page, highlightedWord);
  await toolbar.getByRole("button").nth(0).click();
  const highlight = page
    .locator('.page[data-page-number="1"] [data-annottype="HIGHLIGHT"]')
    .first();
  await expect(highlight).toBeVisible();
  await expect(highlight).toBeInViewport();

  await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
  await expect(
    page.getByRole("button").filter({ hasText: highlightedWord }).first()
  ).toBeVisible();
  return fileName;
}

/** Enters a new comment through the PDF annotation toolbar. */
async function enterComment(page: Page) {
  const commentToolbar = await selectPdfWord(page, "Lorem");
  await commentToolbar.getByRole("button").nth(3).click();
  const editor = page.getByPlaceholder("Enter your comment");
  await expect(editor).toBeVisible();
  await editor.fill(comment);
  await expect(editor).toHaveValue(comment);
  return editor;
}

/** Asserts that creating a new comment offers Save and persists a bookmark. */
async function saveComment(page: Page, editor: Locator) {
  const save = page
    .locator("[data-pdf-annotation-overlay]")
    .filter({ has: editor })
    .getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await save.click();
  await expect(editor).toBeHidden();

  await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
  await expect(
    page.getByRole("button").filter({ hasText: comment }).first()
  ).toBeVisible();
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
  const highlight = page
    .locator('.page[data-page-number="1"] [data-annottype="HIGHLIGHT"]')
    .first();
  await expect(highlight).toBeVisible();
  const pdfToolbar = page
    .locator("#viewer-parent")
    .locator("xpath=../../following-sibling::div");
  for (let zoom = 0; zoom < 5; zoom += 1) {
    await pdfToolbar.getByRole("button").nth(5).click();
  }
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
  test.use({ viewport: { width: 1512, height: 600 } });

  test("offline PDF highlights survive reload and bookmark navigation", async ({
    page
  }) => {
    test.skip(
      isCloudAuthModeActive(),
      "This case exercises local-only PDF persistence"
    );
    test.setTimeout(180_000);
    const fileName = await captureHighlightedPdf(page);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await expectRestoredAnnotations(page, fileName);
  });

  test("new PDF comments can be saved and reopened", async ({ page }) => {
    test.skip(
      isCloudAuthModeActive(),
      "This regression uses a fresh offline workspace"
    );
    test.setTimeout(120_000);
    const fileName = await uploadPdf(page);
    const editor = await enterComment(page);
    test.fail(
      true,
      "PDF comment editor flips Save to Update when typing, so new comments cannot be saved"
    );
    await saveComment(page, editor);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await openNodeRecordFromLibrary(page, fileName);
    await openPdfContent(page);
    await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
    await expect(
      page.getByRole("button").filter({ hasText: comment }).first()
    ).toBeVisible();
  });

  test("PDF highlights restore from cloud in a fresh authenticated context @auth", async ({
    page,
    browser,
    baseURL
  }) => {
    test.skip(
      !isCloudAuthModeActive(),
      "A cloud round trip needs an authenticated account and FileFn"
    );
    test.setTimeout(240_000);
    const fileName = await captureHighlightedPdf(page);
    const { cookies } = await page.context().storageState();
    const restoredContext = await browser.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      viewport: { width: 1512, height: 600 },
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

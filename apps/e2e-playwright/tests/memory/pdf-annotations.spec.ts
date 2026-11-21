import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page
} from "@playwright/test";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import { openDeclaredNodeBookmarksPanel } from "../utils/settings-contracts";
import {
  getResourceContextMenuTrigger,
  getResourceThumbnail
} from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  openCapture,
  openNodeRecordFromLibrary,
  openNodesLibrary
} from "./memory-test-helpers";

const pdfFixturePath = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);
const highlightedWord = "versions";
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
async function selectPdfWord(page: Page, word: string, useLastMatch = false) {
  const matches = page
    .locator('.page[data-page-number="1"] .textLayer span')
    .filter({ hasText: new RegExp(`\\b${word}\\b`, "i") });
  const text = useLastMatch ? matches.last() : matches.first();
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
async function highlightPdf(page: Page) {
  const toolbar = await selectPdfWord(page, highlightedWord, true);
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
}

/** Removes bookmark children before deleting the uploaded PDF through Library. */
async function deletePdfFixture(page: Page, nodeId: string) {
  const errors: unknown[] = [];
  try {
    await openPdfContent(page);
    const highlights = page.locator('[data-annottype="HIGHLIGHT"]');
    while ((await highlights.count()) > 0) {
      await highlights.first().click();
      const deleteButton = page
        .locator("button[data-pdf-annotation-overlay]")
        .locator("button")
        .first();
      await expect(deleteButton).toBeVisible();
      const highlightId = await highlights.first().getAttribute("id");
      await deleteButton.click();
      await expect(page.locator(`[id="${highlightId}"]`)).toHaveCount(0);
    }
    await openDeclaredNodeBookmarksPanel(page, test.info().project.name);
    await expect(
      page.getByRole("button").filter({ hasText: highlightedWord })
    ).toHaveCount(0);
  } catch (error) {
    errors.push(error);
  }
  try {
    await closeNodeRecord(page);
    await openNodesLibrary(page);
    const thumbnail = getResourceThumbnail(page, nodeId);
    await expect(thumbnail).toBeVisible();
    await thumbnail.hover();
    await getResourceContextMenuTrigger(thumbnail).click();
    const deleteItem = page.locator('[data-context-menu-item-id="delete"]');
    await expect(deleteItem).toBeVisible();
    await deleteItem.click();
    await expect(thumbnail).toBeHidden();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length) throw errors[0];
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

/** Verifies durable bookmarks and rendered highlights after reopening. */
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
  await expect(highlight).toHaveAttribute("data-annottype", "HIGHLIGHT");
  return { bookmark, highlight };
}

/** Verifies bookmark navigation from an offscreen PDF passage. */
async function expectBookmarkNavigation(
  page: Page,
  bookmark: Locator,
  highlight: Locator
) {
  const pdfToolbar = page
    .locator("#viewer-parent")
    .locator("xpath=../../following-sibling::div");
  for (let zoom = 0; zoom < 10; zoom += 1) {
    await pdfToolbar.getByRole("button").nth(5).click();
  }
  await page.locator("#viewerContainer").evaluate((viewer) => {
    viewer.scrollTop = 0;
  });
  await expect(highlight).not.toBeInViewport();
  test.fail(
    true,
    "scrollToAnnot builds an invalid CSS class selector from annotation ids containing ':' (PdfAnnotator.svelte), so bookmark clicks don't scroll to the passage"
  );
  await bookmark.click();
  await expect(highlight).toBeInViewport({ timeout: 15_000 });
  await expect(highlight).toHaveAttribute("data-annottype", "HIGHLIGHT");
  await expect(page.locator('.page[data-page-number="1"]')).toBeInViewport();
}

test.describe("memory - PDF annotation durability @creation", () => {
  test.use({ viewport: { width: 1512, height: 600 } });

  test("offline PDF highlights survive reload", async ({ page }) => {
    test.skip(
      isCloudAuthModeActive(),
      "This case exercises local-only PDF persistence"
    );
    test.setTimeout(180_000);
    const fileName = await uploadPdf(page);
    await highlightPdf(page);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await expectRestoredAnnotations(page, fileName);
  });

  test("selecting a PDF highlight bookmark scrolls to its passage", async ({
    page
  }) => {
    test.skip(
      isCloudAuthModeActive(),
      "This regression uses a fresh offline workspace"
    );
    test.setTimeout(180_000);
    const fileName = await uploadPdf(page);
    await highlightPdf(page);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);
    const { bookmark, highlight } = await expectRestoredAnnotations(
      page,
      fileName
    );
    await expectBookmarkNavigation(page, bookmark, highlight);
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
    const fileName = await uploadPdf(page);
    const nodeId = new URL(page.url()).searchParams.get("page");
    expect(nodeId).toBeTruthy();
    let restoredContext: BrowserContext | undefined;
    let testFailed = false;
    try {
      await highlightPdf(page);
      const { cookies } = await page.context().storageState();
      restoredContext = await browser.newContext({
        baseURL,
        ignoreHTTPSErrors: true,
        viewport: { width: 1512, height: 600 },
        storageState: { cookies, origins: [] }
      });
      expect(
        (await restoredContext.storageState({ indexedDB: true })).origins
      ).toEqual([]);
      const restoredPage = await restoredContext.newPage();
      await blockExternalAuthRequests(restoredPage);
      await ensureInAppOnHome(restoredPage);
      await expectRestoredAnnotations(restoredPage, fileName);
    } catch (error) {
      testFailed = true;
      throw error;
    } finally {
      const cleanupErrors: unknown[] = [];
      try {
        await restoredContext?.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await deletePdfFixture(page, nodeId!);
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (!testFailed && cleanupErrors.length) throw cleanupErrors[0];
    }
  });
});

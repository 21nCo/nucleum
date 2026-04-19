import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import {
  ensureInAppOnHome,
  getProductConfig,
  runCommand
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

const imageFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "nucleus-git-banner.png"
);
const audioFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "client",
  "static",
  "sounds",
  "ping.wav"
);
const fileFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "README.md"
);
const pdfFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);

function blockListLocator(page: Page) {
  return page.locator('#mdContent > div[id^="md-block-"]');
}

function blockLocator(page: Page, index: number) {
  return blockListLocator(page).nth(index);
}

function blockEditor(page: Page, index: number) {
  return blockLocator(page, index).locator("[contenteditable]").first();
}

function pdfViewerLocator(page: Page, index: number) {
  return blockLocator(page, index).locator("#viewer-parent, #viewerContainer").first();
}

function exactTextPattern(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

async function maybeWait(page: Page, ms: number = 900) {
  await page.waitForTimeout(ms);
}

async function waitForDebounce(page: Page, ms: number = 1800) {
  await page.waitForTimeout(ms);
}

async function waitForPersistenceSettle(page: Page, ms: number = 4500) {
  await page.waitForTimeout(ms);
}

async function createNodeViaCapture(page: Page, title: string) {
  const captureButton = page.getByRole("button", { name: /^Capture$/i }).first();
  await captureButton.click({ timeout: 8_000 });
  await maybeWait(page, 700);

  const titleEditor = page.locator("#capture-title").first();
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();

  const editorVisible = await contenteditable.isVisible().catch(() => false);
  if (!editorVisible) {
    const markdownButton = page.locator('button[data-value="MARKDOWN"]').first();
    if (await markdownButton.isVisible().catch(() => false)) {
      await markdownButton.click({ timeout: 5_000 });
      await maybeWait(page, 700);
    }
  }

  await titleEditor.waitFor({ state: "visible", timeout: 15_000 });
  await contenteditable.waitFor({ state: "visible", timeout: 15_000 });

  await titleEditor.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await maybeWait(page, 300);

  await contenteditable.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await waitForDebounce(page, 1200);

  const saveButton = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveButton).toBeVisible({ timeout: 10_000 });
  await saveButton.click({ timeout: 10_000 });
  await maybeWait(page, 1_600);

  const closeButton = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ timeout: 5_000 });
    await maybeWait(page, 800);
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await maybeWait(page, 500);
  }
}

async function createCollection(page: Page, name: string) {
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(name);
  const modal = page.locator("#collection_create");
  await modal
    .getByRole("button", { name: /Save.*Enter/i })
    .click({ timeout: 5_000 });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await maybeWait(page, 1_200);
}

async function openNodeFromLibrary(page: Page, title: string) {
  await page.goto("/library?resource=node&type=all", {
    waitUntil: "domcontentloaded"
  });
  await maybeWait(page, 1_000);
  const row = page.locator(".resource").filter({ hasText: title }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1_500);
}

async function openNodeFromLibraryById(page: Page, nodeId: string) {
  await page.goto("/library?resource=node&type=all", {
    waitUntil: "domcontentloaded"
  });
  await maybeWait(page, 1_000);
  const row = page.locator(`.resource[data-id="${nodeId}"]`).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1_500);
}

async function ensureNodeSurface(page: Page) {
  await expect
    .poll(
      () => {
        const resource = new URL(page.url()).searchParams.get("r");
        return resource?.startsWith("node:") ?? false;
      },
      { timeout: 15_000 }
    )
    .toBe(true);

  await expect(page.getByPlaceholder("Node title").first()).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByLabel("Markdown editor").first()).toBeVisible({
    timeout: 15_000
  });
}

async function focusBlock(page: Page, index: number) {
  const editor = blockEditor(page, index);
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click({ timeout: 5_000 });
  return editor;
}

async function clearFocusedBlock(page: Page) {
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await maybeWait(page, 150);
  await page.keyboard.press("Backspace");
  await maybeWait(page, 250);
}

async function waitForBlockType(page: Page, index: number, type: string) {
  await expect(blockLocator(page, index)).toHaveAttribute("data-content", type, {
    timeout: 15_000
  });
}

async function waitForBlockCount(page: Page, count: number) {
  await expect
    .poll(() => blockListLocator(page).count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(count);
}

async function createHeadingBlock(
  page: Page,
  index: number,
  level: 1 | 2 | 3 | 4,
  text: string
) {
  const editor = await focusBlock(page, index);
  const currentText = (await editor.textContent())?.trim() ?? "";
  if (currentText) {
    await clearFocusedBlock(page);
  }
  await page.keyboard.type(`${"#".repeat(level)} `, { delay: 35 });
  await waitForBlockType(page, index, `HEADING${level}`);
  await focusBlock(page, index);
  await page.keyboard.insertText(text);
  await maybeWait(page, 900);
  await expect(blockLocator(page, index)).toContainText(text, {
    timeout: 10_000
  });
}

async function createHeadingBlockViaBrowser(
  page: Page,
  index: number,
  level: 3,
  text: string
) {
  await convertCurrentBlockBySlash(
    page,
    index,
    `/heading ${level}`,
    `Heading ${level}`,
    `HEADING${level}`
  );
  await focusBlock(page, index);
  await page.keyboard.insertText(text);
  await maybeWait(page, 900);
  await expect(blockLocator(page, index)).toContainText(text, {
    timeout: 10_000
  });
}

async function convertCurrentBlockBySlash(
  page: Page,
  index: number,
  query: string,
  label: string,
  type: string
) {
  const editor = await focusBlock(page, index);
  const currentText = (await editor.textContent())?.trim() ?? "";
  if (currentText) {
    await clearFocusedBlock(page);
  }
  await page.keyboard.type(query, { delay: 25 });
  await chooseBlockBrowserItem(page, label);
  await waitForBlockType(page, index, type);
  await maybeWait(page, 600);
}

async function createSlashTextBlock(
  page: Page,
  index: number,
  query: string,
  label: string,
  type: string,
  text: string
) {
  await convertCurrentBlockBySlash(page, index, query, label, type);
  await focusBlock(page, index);
  await page.keyboard.type(text, { delay: 25 });
  await maybeWait(page, 900);
  await expect(blockLocator(page, index)).toContainText(text, {
    timeout: 10_000
  });
}

async function createCodeBlock(page: Page, index: number, text: string) {
  await convertCurrentBlockBySlash(page, index, "/code", "Code", "CODE");
  const editorButton = blockLocator(page, index)
    .locator('.code-container button[type="button"]')
    .first();
  await editorButton.waitFor({ state: "visible", timeout: 10_000 });
  await editorButton.click({ timeout: 5_000 });
  const textarea = blockLocator(page, index).locator("textarea").first();
  await textarea.waitFor({ state: "visible", timeout: 10_000 });
  await textarea.fill(text);
  await maybeWait(page, 700);
  await expect(textarea).toHaveValue(text, {
    timeout: 10_000
  });
}

async function uploadEmbedFixture(
  page: Page,
  index: number,
  label: string,
  filePath: string,
  expectedText: string
) {
  await convertCurrentBlockBySlash(page, index, `/${label.toLowerCase()}`, label, "EMBED");
  const input = blockLocator(page, index).locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  await expect(blockLocator(page, index)).toContainText(expectedText, {
    timeout: 30_000
  });
}

async function uploadImageEmbed(page: Page, index: number) {
  await convertCurrentBlockBySlash(page, index, "/image", "Image", "EMBED");
  const input = blockLocator(page, index).locator('input[type="file"]').first();
  await input.setInputFiles(imageFixturePath);
  await expect(blockLocator(page, index).locator("img").first()).toBeVisible({
    timeout: 30_000
  });
  await waitForBlockCount(page, index + 2);
}

async function uploadAudioEmbed(page: Page, index: number) {
  await uploadEmbedFixture(page, index, "Audio", audioFixturePath, "ping");
  await waitForBlockCount(page, index + 2);
}

async function uploadPdfEmbed(page: Page, index: number) {
  await uploadEmbedFixture(page, index, "PDF", pdfFixturePath, "Lorem_ipsum.pdf");
  await expect(pdfViewerLocator(page, index)).toBeVisible({
    timeout: 45_000
  });
  await waitForBlockCount(page, index + 2);
}

async function uploadFileEmbed(page: Page, index: number) {
  await uploadEmbedFixture(page, index, "File", fileFixturePath, "README.md");
  await waitForBlockCount(page, index + 2);
}

async function uploadMediaGridFixture(page: Page, index: number) {
  await convertCurrentBlockBySlash(
    page,
    index,
    "/media grid",
    "Media grid",
    "MEDIA_GRID"
  );
  const input = blockLocator(page, index).locator('input[type="file"]').first();
  await input.setInputFiles(imageFixturePath);
  await expect(blockLocator(page, index).locator("img").first()).toBeVisible({
    timeout: 30_000
  });
}

async function embedCollectionFromLibrary(
  page: Page,
  index: number,
  collectionName: string
) {
  await convertCurrentBlockBySlash(
    page,
    index,
    "/embed collection",
    "Embed collection",
    "EMBED"
  );
  await blockLocator(page, index).evaluate((block) => {
    const buttons = Array.from(block.querySelectorAll("button"));
    const wrapper = buttons.find((button) => {
      const label = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return label.includes("Choose from library") && button.querySelector("button");
    });
    if (!(wrapper instanceof HTMLButtonElement)) {
      throw new Error("Choose from library wrapper button not found");
    }
    wrapper.click();
  });
  const searchInput = page.locator('input[placeholder*="Search"]').last();
  await searchInput.waitFor({ state: "visible", timeout: 10_000 });
  await searchInput.fill(collectionName);
  const result = page
    .locator("button")
    .filter({ hasText: new RegExp(collectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
    .last();
  await result.waitFor({ state: "visible", timeout: 15_000 });
  await result.click({ timeout: 5_000 });
  await expect(blockLocator(page, index)).toContainText(collectionName, {
    timeout: 20_000
  });
}

async function submitEmbedLink(page: Page, index: number, url: string) {
  const scope = blockLocator(page, index);
  const input = scope
    .getByPlaceholder("Type or paste embed code/link here")
    .first();
  await input.waitFor({ state: "visible", timeout: 15_000 });
  await input.fill(url);
  const goButton = scope.getByRole("button", { name: exactTextPattern("Go") }).last();
  await goButton.waitFor({ state: "visible", timeout: 10_000 });
  await goButton.click({ timeout: 5_000 });
  await maybeWait(page, 900);
}

async function createGenericWebEmbed(page: Page, index: number, url: string) {
  await convertCurrentBlockBySlash(page, index, "/embed", "Embed anything", "EMBED");
  await submitEmbedLink(page, index, url);
  await expect(
    blockLocator(page, index).getByPlaceholder("Type or paste embed code/link here")
  ).toHaveCount(0, {
    timeout: 30_000
  });
  await expect(blockLocator(page, index)).toContainText("Preview not available", {
    timeout: 30_000
  });
}

async function createYoutubeEmbed(page: Page, index: number, url: string) {
  await convertCurrentBlockBySlash(page, index, "/embed", "Embed anything", "EMBED");
  await submitEmbedLink(page, index, url);
  await expect(
    blockLocator(page, index).locator('[id^="player-container-"]').first()
  ).toBeVisible({
    timeout: 30_000
  });
}

async function chooseBlockBrowserItem(page: Page, label: string) {
  const item = page
    .locator(".blockbrowser button")
    .filter({
      has: page
        .locator("div.text-left")
        .filter({ hasText: exactTextPattern(label) })
    })
    .first();
  await item.waitFor({ state: "visible", timeout: 10_000 });
  await item.scrollIntoViewIfNeeded();
  try {
    await item.click({ timeout: 5_000 });
  } catch {
    await maybeWait(page, 250);
  }
  await maybeWait(page, 600);
}

async function addMention(page: Page, query: string, expectedLabel: string) {
  await page.keyboard.type("@", { delay: 40 });
  await maybeWait(page, 350);
  const result = page
    .locator("button.p-2.w-full.flex.items-start")
    .filter({ hasText: expectedLabel })
    .first();
  const isVisibleFromRecents = await result.isVisible().catch(() => false);
  if (!isVisibleFromRecents) {
    await page.keyboard.type(query, { delay: 40 });
  }
  await expect(result).toBeVisible({ timeout: 15_000 });
  await waitForDebounce(page, 900);
  await result.click({ timeout: 5_000 });
  await maybeWait(page, 1_000);
}

test.describe("node - markdown flows @feature @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\\.google\\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("markdown node renders, converts, and persists headings, mentions, quote, and list blocks", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );

    test.setTimeout(180_000);
    await ensureInAppOnHome(page);

    const token = Date.now();
    const mentionTargetTitle = `MentionTarget${token}`;
    const nodeTitle = `MarkdownNode${token}`;
    const primaryHeading = `Primary Heading ${token}`;
    const secondaryHeading = `Secondary Heading ${token}`;
    const paragraphText = `Paragraph body ${token}`;
    const quoteText = `Quote block ${token}`;
    const listText = `List item ${token}`;

    await createNodeViaCapture(page, mentionTargetTitle);
    await createNodeViaCapture(page, nodeTitle);

    await openNodeFromLibrary(page, nodeTitle);
    await ensureNodeSurface(page);

    const nodeId = new URL(page.url()).searchParams.get("r");
    expect(nodeId?.startsWith("node:")).toBeTruthy();

    await createHeadingBlock(page, 0, 1, primaryHeading);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 2);
    await focusBlock(page, 1);
    await page.keyboard.type(`${paragraphText} `, { delay: 25 });
    await addMention(page, mentionTargetTitle, mentionTargetTitle);
    await expect(blockLocator(page, 1).locator(".inline-mention").first()).toContainText(
      mentionTargetTitle,
      {
        timeout: 10_000
      }
    );

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 3);
    await focusBlock(page, 2);
    await page.keyboard.type("/quote", { delay: 25 });
    await chooseBlockBrowserItem(page, "Quote");
    await waitForBlockType(page, 2, "QUOTE");
    await page.keyboard.type(quoteText, { delay: 25 });
    await expect(blockLocator(page, 2)).toContainText(quoteText, {
      timeout: 10_000
    });

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 4);
    await createHeadingBlock(page, 3, 2, secondaryHeading);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 5);
    await focusBlock(page, 4);
    await page.keyboard.type("/unordered", { delay: 25 });
    await chooseBlockBrowserItem(page, "Unordered List");
    await waitForBlockType(page, 4, "LIST");
    await page.keyboard.type(listText, { delay: 25 });
    await expect(blockLocator(page, 4)).toContainText(listText, {
      timeout: 10_000
    });
    await expect(blockLocator(page, 4)).not.toContainText("/unordered");

    await waitForDebounce(page, 2_200);
    await openNodeFromLibraryById(page, nodeId!);
    await ensureNodeSurface(page);

    await expect(page.getByText(primaryHeading, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(secondaryHeading, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(listText, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(blockLocator(page, 1).locator(".inline-mention").first()).toContainText(
      mentionTargetTitle,
      {
        timeout: 10_000
      }
    );
    await expect(blockLocator(page, 2)).toHaveAttribute("data-content", "QUOTE", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 3)).toHaveAttribute("data-content", "HEADING2", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 4)).toHaveAttribute("data-content", "LIST", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 4)).not.toContainText("/unordered");
  });

  test("markdown node renders and persists extended block types across reopen", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );

    test.setTimeout(240_000);
    await ensureInAppOnHome(page);

    const token = Date.now();
    const nodeTitle = `MarkdownMatrixNode${token}`;
    const primaryHeading = `Matrix Heading 1 ${token}`;
    const secondaryHeading = `Matrix Heading 2 ${token}`;
    const tertiaryHeading = `MatrixHeading3${token}`;
    const orderedListText = `Matrix ordered ${token}`;
    const checklistText = `Matrix checklist ${token}`;
    const calloutText = `Matrix callout ${token}`;
    const codeText = `const matrixValue = ${token};`;

    await createNodeViaCapture(page, nodeTitle);
    await openNodeFromLibrary(page, nodeTitle);
    await ensureNodeSurface(page);

    const nodeId = new URL(page.url()).searchParams.get("r");
    expect(nodeId?.startsWith("node:")).toBeTruthy();

    await createHeadingBlock(page, 0, 1, primaryHeading);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 2);
    await createSlashTextBlock(
      page,
      1,
      "/ordered",
      "Ordered List",
      "ORDERED_LIST",
      orderedListText
    );

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 3);
    await createSlashTextBlock(
      page,
      2,
      "/check",
      "Checklist",
      "CHECKLIST",
      checklistText
    );

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 4);
    await createSlashTextBlock(
      page,
      3,
      "/callout",
      "Callout",
      "CALLOUT",
      calloutText
    );

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 5);
    await createCodeBlock(page, 4, codeText);
    await waitForBlockCount(page, 6);

    await convertCurrentBlockBySlash(page, 5, "/divider", "Divider", "DIVIDER");
    await waitForBlockCount(page, 7);

    await convertCurrentBlockBySlash(
      page,
      6,
      "/double divider",
      "Double Divider",
      "DOUBLE_DIVIDER"
    );
    await waitForBlockCount(page, 8);

    await createHeadingBlock(page, 7, 2, secondaryHeading);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 9);
    await createHeadingBlockViaBrowser(page, 8, 3, tertiaryHeading);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 10);
    await convertCurrentBlockBySlash(
      page,
      9,
      "/embed",
      "Embed anything",
      "EMBED"
    );
    await expect(
      blockLocator(page, 9).getByPlaceholder("Type or paste embed code/link here")
    ).toBeVisible({
      timeout: 10_000
    });
    await expect(blockLocator(page, 9)).toContainText("Choose from library", {
      timeout: 10_000
    });
    await waitForBlockCount(page, 11);

    await uploadImageEmbed(page, 10);
    await uploadAudioEmbed(page, 11);
    await uploadPdfEmbed(page, 12);
    await uploadMediaGridFixture(page, 13);
    await expect(blockLocator(page, 13).locator("img").first()).toBeVisible({
      timeout: 30_000
    });

    await waitForPersistenceSettle(page);
    await openNodeFromLibraryById(page, nodeId!);
    await ensureNodeSurface(page);

    await expect(page.getByText(primaryHeading, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(orderedListText, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(checklistText, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(calloutText, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(codeText, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(secondaryHeading, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(tertiaryHeading, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });

    await expect(blockLocator(page, 1)).toHaveAttribute("data-content", "ORDERED_LIST", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 2)).toHaveAttribute("data-content", "CHECKLIST", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 3)).toHaveAttribute("data-content", "CALLOUT", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 4)).toHaveAttribute("data-content", "CODE", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 5)).toHaveAttribute("data-content", "DIVIDER", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 6)).toHaveAttribute(
      "data-content",
      "DOUBLE_DIVIDER",
      {
        timeout: 10_000
      }
    );
    await expect(blockLocator(page, 7)).toHaveAttribute("data-content", "HEADING2", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 8)).toHaveAttribute("data-content", "HEADING3", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 9)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(
      blockLocator(page, 9).getByPlaceholder("Type or paste embed code/link here")
    ).toBeVisible({
      timeout: 10_000
    });
    await expect(blockLocator(page, 9)).toContainText("Choose from library", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 10)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 10).locator("img").first()).toBeVisible({
      timeout: 15_000
    });
    await expect(blockLocator(page, 11)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 11)).toContainText("ping", {
      timeout: 15_000
    });
    await expect(blockLocator(page, 12)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 12)).toContainText("Lorem_ipsum.pdf", {
      timeout: 15_000
    });
    await expect(pdfViewerLocator(page, 12)).toBeVisible({
      timeout: 15_000
    });
    await expect(blockLocator(page, 13)).toHaveAttribute("data-content", "MEDIA_GRID", {
      timeout: 10_000
    });
    await expect(blockLocator(page, 13).locator("img").first()).toBeVisible({
      timeout: 30_000
    });
  });

  test("markdown node renders and persists heading 4, file uploads, and collection embeds across reopen", async ({
    page
  }, testInfo) => {
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.skip(
      !productConfig.capabilities.records.collection,
      "Collection record page is not part of this product contract"
    );

    test.setTimeout(240_000);
    await ensureInAppOnHome(page);

    const token = Date.now();
    const collectionName = `MarkdownEmbedCollection${token}`;
    const nodeTitle = `MarkdownRichEmbedNode${token}`;
    const headingFour = `Heading Four ${token}`;

    await createCollection(page, collectionName);
    await createNodeViaCapture(page, nodeTitle);
    await openNodeFromLibrary(page, nodeTitle);
    await ensureNodeSurface(page);

    const nodeId = new URL(page.url()).searchParams.get("r");
    expect(nodeId?.startsWith("node:")).toBeTruthy();

    await createHeadingBlock(page, 0, 4, headingFour);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 2);
    await uploadFileEmbed(page, 1);

    await page.keyboard.press("Enter");
    await waitForBlockCount(page, 3);
    await embedCollectionFromLibrary(page, 2, collectionName);

    await waitForPersistenceSettle(page);
    await openNodeFromLibraryById(page, nodeId!);
    await ensureNodeSurface(page);

    await expect(page.getByText(headingFour, { exact: false }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(blockLocator(page, 0)).toHaveAttribute("data-content", "HEADING4", {
      timeout: 15_000
    });
    await expect(blockLocator(page, 1)).toHaveAttribute("data-content", "EMBED", {
      timeout: 15_000
    });
    await expect(blockLocator(page, 1)).toContainText("README.md", {
      timeout: 20_000
    });
    await expect(blockLocator(page, 2)).toHaveAttribute("data-content", "EMBED", {
      timeout: 15_000
    });
    await expect(blockLocator(page, 2)).toContainText(collectionName, {
      timeout: 20_000
    });
  });

  test("markdown node renders and persists url-driven web embed across reopen", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );

    test.setTimeout(240_000);
    await ensureInAppOnHome(page);

    const token = Date.now();
    const nodeTitle = `MarkdownWebEmbed${token}`;
    const webPageUrl = "https://medium.com/";

    await createNodeViaCapture(page, nodeTitle);
    await openNodeFromLibrary(page, nodeTitle);
    await ensureNodeSurface(page);

    const nodeId = new URL(page.url()).searchParams.get("r");
    expect(nodeId?.startsWith("node:")).toBeTruthy();

    await createGenericWebEmbed(page, 0, webPageUrl);

    await waitForPersistenceSettle(page);
    await openNodeFromLibraryById(page, nodeId!);
    await ensureNodeSurface(page);

    await expect(blockLocator(page, 0)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(
      blockLocator(page, 0).getByPlaceholder("Type or paste embed code/link here")
    ).toHaveCount(0, {
      timeout: 10_000
    });
    await expect(blockLocator(page, 0)).toContainText("Preview not available", {
      timeout: 15_000
    });
  });

  test("markdown node renders and persists url-driven youtube embed across reopen", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );

    test.setTimeout(240_000);
    await ensureInAppOnHome(page);

    const token = Date.now();
    const nodeTitle = `MarkdownYoutubeEmbed${token}`;
    const youtubeUrl = "https://www.youtube.com/watch?v=SeWdndc7y4A";

    await createNodeViaCapture(page, nodeTitle);
    await openNodeFromLibrary(page, nodeTitle);
    await ensureNodeSurface(page);

    const nodeId = new URL(page.url()).searchParams.get("r");
    expect(nodeId?.startsWith("node:")).toBeTruthy();

    await createYoutubeEmbed(page, 0, youtubeUrl);

    await waitForPersistenceSettle(page);
    await openNodeFromLibraryById(page, nodeId!);
    await ensureNodeSurface(page);

    await expect(blockLocator(page, 0)).toHaveAttribute("data-content", "EMBED", {
      timeout: 10_000
    });
    await expect(
      blockLocator(page, 0).locator('[id^="player-container-"]').first()
    ).toBeVisible({
      timeout: 15_000
    });
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import {
  captureConsole,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  getNavProductConfig,
  parseProject,
  runCommand,
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface MarkdownStepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface MarkdownSnapshot {
  href: string;
  title: string;
  blocks: Array<{
    id: string;
    type: string;
    text: string;
    mentions: string[];
  }>;
  toc: string[];
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  nodeTitle: string;
  mentionTargetTitle: string;
  primaryHeading: string;
  secondaryHeading: string;
  tertiaryHeading: string;
  paragraphText: string;
  quoteText: string;
  listText: string;
  orderedListText: string;
  checklistText: string;
  calloutText: string;
  codeText: string;
  steps: Record<string, MarkdownStepResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-markdown-node-deep-dive"
);
const imageFixturePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "nucleus-git-banner.png"
);
const audioFixturePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "client",
  "static",
  "sounds",
  "ping.wav"
);
const fileFixturePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "README.md"
);
const pdfFixturePath = path.join(
  __dirname,
  "..",
  "tests",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function captureStep(page: Page, artifactDir: string, name: string) {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: true
  });
  await fs.writeFile(
    path.join(artifactDir, `${name}.html`),
    await page.content(),
    "utf8"
  );
}

async function appendProgress(artifactDir: string, message: string) {
  await fs.appendFile(
    path.join(artifactDir, "progress.log"),
    `${new Date().toISOString()} ${message}\n`,
    "utf8"
  );
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

async function enterHomeSurface(page: Page, baseURL: string, project: ProjectName) {
  const productConfig = getNavProductConfig(project);
  const homePath = `/${productConfig.homePath}`;
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("offlineSessionId")) {
      const value =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem("offlineSessionId", value);
    }
  });
  await page.goto(new URL(homePath, baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForURL(
    (url) => {
      const pathname = new URL(url).pathname;
      return pathname === homePath || pathname.startsWith(`${homePath}/`);
    },
    { timeout: 15_000, waitUntil: "domcontentloaded" }
  );
  await page.waitForLoadState("domcontentloaded");
}

async function createNodeViaCapture(
  page: Page,
  title: string,
  baseURL: string,
  project: ProjectName
) {
  const captureButton = page.getByRole("button", { name: /^Capture$/i }).first();
  if (await captureButton.isVisible().catch(() => false)) {
    await captureButton.click({ timeout: 5_000 });
    await maybeWait(page, 700);
  } else {
    const homePath = getNavProductConfig(project).homePath;
    await page.goto(new URL(`/${homePath}?m=node_create`, baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await maybeWait(page, 700);
  }
  const titleEditor = page.locator("#capture-title").first();
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();
  const editorVisible = await contenteditable.isVisible().catch(() => false);
  if (!editorVisible) {
    const pageModeButton = page.locator('button[data-value="MARKDOWN"]').first();
    if (await pageModeButton.isVisible().catch(() => false)) {
      await pageModeButton.click({ timeout: 5_000 });
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

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ timeout: 10_000 });
  await maybeWait(page, 1600);

  const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => null);
    await maybeWait(page, 800);
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await maybeWait(page, 500);
  }
}

async function createCollectionViaCommand(page: Page, name: string) {
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

async function navigateToNodesLibrary(page: Page, baseURL: string) {
  await page.goto(new URL("/library?resource=node&type=all", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await maybeWait(page, 1000);
}

async function openNodeFromLibrary(page: Page, baseURL: string, title: string) {
  await navigateToNodesLibrary(page, baseURL);
  const row = page.locator(".resource").filter({ hasText: title }).first();
  const fallback = page.getByText(title, { exact: false }).first();
  const target = (await row.isVisible().catch(() => false)) ? row : fallback;
  await target.waitFor({ state: "visible", timeout: 20_000 });
  await target.click({ timeout: 5_000 });
  await maybeWait(page, 1500);
}

async function openNodeFromLibraryById(page: Page, baseURL: string, nodeId: string) {
  await navigateToNodesLibrary(page, baseURL);
  const row = page.locator(`.resource[data-id="${nodeId}"]`).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1500);
}

async function ensureNodeSurface(page: Page, title: string) {
  await expect
    .poll(
      () => {
        const resource = new URL(page.url()).searchParams.get("r");
        return resource?.startsWith("node:") ?? false;
      },
      { timeout: 15_000 }
    )
    .toBe(true);

  const titleInput = page.getByPlaceholder("Node title").first();
  await expect(titleInput).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Markdown editor").first()).toBeVisible({
    timeout: 15_000
  });
  void title;
}

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

async function focusBlock(page: Page, index: number) {
  const editor = blockEditor(page, index);
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click({ timeout: 5_000 });
  return editor;
}

async function replaceBlockText(page: Page, index: number, text: string) {
  const editor = await focusBlock(page, index);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await maybeWait(page, 150);
  await page.keyboard.type(text, { delay: 25 });
  await maybeWait(page, 800);
  return editor;
}

async function clearFocusedBlock(page: Page) {
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await maybeWait(page, 150);
  await page.keyboard.press("Backspace");
  await maybeWait(page, 250);
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
  await waitForBlockCount(page, index + 2);
}

async function submitEmbedLink(page: Page, index: number, url: string) {
  const scope = blockLocator(page, index);
  const input = scope
    .getByPlaceholder("Type or paste embed code/link here")
    .first();
  await input.waitFor({ state: "visible", timeout: 15_000 });
  await input.fill(url);
  const goButton = scope.getByRole("button", {
    name: exactTextPattern("Go")
  }).last();
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
  const resultVisibleFromRecents = await result.isVisible().catch(() => false);
  if (!resultVisibleFromRecents) {
    await page.keyboard.type(query, { delay: 40 });
  }
  await expect(result).toBeVisible({ timeout: 15_000 });
  await waitForDebounce(page, 900);
  await result.click({ timeout: 5_000 });
  await maybeWait(page, 1000);
}

async function collectMarkdownSnapshot(page: Page): Promise<MarkdownSnapshot> {
  return page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[id^="md-block-"]')).map(
      (element) => {
        const html = element as HTMLElement;
        const mentions = Array.from(
          html.querySelectorAll(".inline-mention")
        ).map((mention) => mention.textContent?.trim() ?? "");
        return {
          id: html.id,
          type: html.getAttribute("data-content") ?? "",
          text: html.textContent?.replace(/\s+/g, " ").trim() ?? "",
          mentions
        };
      }
    );

    const toc = Array.from(
      document.querySelectorAll('a[href^="#"]')
    )
      .map((anchor) => anchor.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);

    const titleInput = document.querySelector(
      'input[placeholder="Node title"]'
    ) as HTMLInputElement | null;

    return {
      href: window.location.href,
      title: titleInput?.value ?? "",
      blocks,
      toc
    };
  });
}

async function createMarkdownStructure(
  page: Page,
  collectionName: string,
  primaryHeading: string,
  paragraphText: string,
  mentionQuery: string,
  mentionTargetTitle: string,
  quoteText: string,
  secondaryHeading: string,
  listText: string,
  orderedListText: string,
  checklistText: string,
  calloutText: string,
  codeText: string,
  tertiaryHeading: string,
  quaternaryHeading: string
) {
  await createHeadingBlock(page, 0, 1, primaryHeading);

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 2);
  await focusBlock(page, 1);
  await page.keyboard.type(`${paragraphText} `, { delay: 25 });
  await addMention(page, mentionQuery, mentionTargetTitle);
  await expect(blockLocator(page, 1).locator(".inline-mention").first()).toBeVisible({
    timeout: 10_000
  });

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 3);
  await focusBlock(page, 2);
  await page.keyboard.type("/quote", { delay: 25 });
  await chooseBlockBrowserItem(page, "Quote");
  await waitForBlockType(page, 2, "QUOTE");
  await page.keyboard.type(quoteText, { delay: 25 });

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

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 6);
  await createSlashTextBlock(
    page,
    5,
    "/ordered",
    "Ordered List",
    "ORDERED_LIST",
    orderedListText
  );

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 7);
  await createSlashTextBlock(
    page,
    6,
    "/check",
    "Checklist",
    "CHECKLIST",
    checklistText
  );

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 8);
  await createSlashTextBlock(
    page,
    7,
    "/callout",
    "Callout",
    "CALLOUT",
    calloutText
  );

  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 9);
  await createCodeBlock(page, 8, codeText);
  await waitForBlockCount(page, 10);

  await convertCurrentBlockBySlash(page, 9, "/divider", "Divider", "DIVIDER");
  await waitForBlockCount(page, 11);

  await convertCurrentBlockBySlash(
    page,
    10,
    "/double divider",
    "Double Divider",
    "DOUBLE_DIVIDER"
  );
  await waitForBlockCount(page, 12);

  await createHeadingBlockViaBrowser(page, 11, 3, tertiaryHeading);
  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 13);
  await createHeadingBlock(page, 12, 4, quaternaryHeading);
  await page.keyboard.press("Enter");
  await waitForBlockCount(page, 14);
  await convertCurrentBlockBySlash(
    page,
    13,
    "/embed",
    "Embed anything",
    "EMBED"
  );
  await expect(
    blockLocator(page, 13).getByPlaceholder("Type or paste embed code/link here")
  ).toBeVisible({
    timeout: 10_000
  });
  await expect(blockLocator(page, 13)).toContainText("Choose from library", {
    timeout: 10_000
  });
  await waitForBlockCount(page, 15);

  await uploadImageEmbed(page, 14);
  await uploadAudioEmbed(page, 15);
  await uploadPdfEmbed(page, 16);
  await uploadFileEmbed(page, 17);
  await embedCollectionFromLibrary(page, 18, collectionName);
  await uploadMediaGridFixture(page, 19);
  await expect(blockLocator(page, 19).locator("img").first()).toBeVisible({
    timeout: 10_000
  });
  await waitForPersistenceSettle(page);
}

async function run() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const authPath = getAuthPath(project);
  const browserConsole: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: Array<{ url: string; errorText: string }> = [];

  const token = Date.now();
  const mentionTargetTitle = `MentionTarget${token}`;
  const mentionQuery = mentionTargetTitle;
  const nodeTitle = `MarkdownNode${token}`;
  const collectionName = `MarkdownCollection${token}`;
  const primaryHeading = `Primary Heading ${token}`;
  const secondaryHeading = `Secondary Heading ${token}`;
  const tertiaryHeading = `TertiaryHeading${token}`;
  const quaternaryHeading = `HeadingFour${token}`;
  const paragraphText = `Paragraph body ${token}`;
  const quoteText = `Quote block ${token}`;
  const listText = `List item ${token}`;
  const orderedListText = `Ordered item ${token}`;
  const checklistText = `Checklist item ${token}`;
  const calloutText = `Callout note ${token}`;
  const codeText = `const answer = ${token};`;
  const steps: ArtifactData["steps"] = {};

  await fs.mkdir(artifactDir, { recursive: true });
  await appendProgress(artifactDir, "artifactDir.created");

  await appendProgress(artifactDir, "browser.launch.start");
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false"
  });
  await appendProgress(artifactDir, "browser.launch.success");

  await appendProgress(artifactDir, "context.create.start");
  const context = await browser.newContext({
    storageState: await fs
      .access(authPath)
      .then(() => authPath)
      .catch(() => undefined)
  });
  await appendProgress(artifactDir, "context.create.success");

  await appendProgress(artifactDir, "page.create.start");
  const page = await context.newPage();
  await appendProgress(artifactDir, "page.create.success");

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? String(error));
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      browserConsole.push({
        type: "navigation",
        text: frame.url()
      });
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  const recordStep = async (
    name: string,
    handler: () => Promise<Record<string, unknown> | void>
  ) => {
    console.log(`[markdown-node-deep-dive] start:${name}`);
    try {
      const details =
        (await Promise.race([
          handler(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Step timed out: ${name}`)),
              90_000
            )
          )
        ])) ?? {};
      steps[name] = {
        success: true,
        details
      };
      console.log(`[markdown-node-deep-dive] success:${name}`);
    } catch (error) {
      steps[name] = {
        success: false,
        error: String(error)
      };
      console.log(`[markdown-node-deep-dive] failure:${name} ${String(error)}`);
      await captureStep(page, artifactDir, `${name}-failure`).catch(() => null);
    }
  };

  try {
    await appendProgress(artifactDir, "enterHomeSurface.start");
    await enterHomeSurface(page, baseURL, project);
    await appendProgress(artifactDir, "enterHomeSurface.success");
    await captureStep(page, artifactDir, "home");
    await appendProgress(artifactDir, "home.captured");

    await recordStep("createMentionTargetNode", async () => {
      await createNodeViaCapture(page, mentionTargetTitle, baseURL, project);
      await captureStep(page, artifactDir, "mention-target-created");
      return {};
    });

    await recordStep("createCollection", async () => {
      await createCollectionViaCommand(page, collectionName);
      return {};
    });

    await recordStep("createMarkdownNode", async () => {
      await createNodeViaCapture(page, nodeTitle, baseURL, project);
      await captureStep(page, artifactDir, "markdown-node-created");
      return {};
    });

    await recordStep("openMarkdownNode", async () => {
      await openNodeFromLibrary(page, baseURL, nodeTitle);
      await ensureNodeSurface(page, nodeTitle);
      await captureStep(page, artifactDir, "markdown-node-opened");
      return {
        nodeId: new URL(page.url()).searchParams.get("r"),
        snapshot: await collectMarkdownSnapshot(page)
      };
    });

    await recordStep("buildMarkdownStructure", async () => {
      await createMarkdownStructure(
        page,
        collectionName,
        primaryHeading,
        paragraphText,
        mentionQuery,
        mentionTargetTitle,
        quoteText,
        secondaryHeading,
        listText,
        orderedListText,
        checklistText,
        calloutText,
        codeText,
        tertiaryHeading,
        quaternaryHeading
      );
      const snapshot = await collectMarkdownSnapshot(page);
      await captureStep(page, artifactDir, "markdown-node-structured");
      return snapshot;
    });

    await recordStep("navigateAwayAndReopen", async () => {
      const nodeId =
        typeof steps.openMarkdownNode?.details?.nodeId === "string"
          ? steps.openMarkdownNode.details.nodeId
          : undefined;
      if (!nodeId) {
        throw new Error("Markdown node id was not captured during openMarkdownNode");
      }
      await openNodeFromLibraryById(page, baseURL, nodeId);
      await ensureNodeSurface(page, nodeTitle);
      const snapshot = await collectMarkdownSnapshot(page);

      await expect(page.getByText(primaryHeading, { exact: false }).first()).toBeVisible({
        timeout: 15_000
      });
      await expect(page.getByText(secondaryHeading, { exact: false }).first()).toBeVisible({
        timeout: 15_000
      });
      await expect(page.getByText(tertiaryHeading, { exact: false }).first()).toBeVisible({
        timeout: 15_000
      });
      await expect(page.getByText(quaternaryHeading, { exact: false }).first()).toBeVisible({
        timeout: 15_000
      });
      await expect(page.getByText(listText, { exact: false }).first()).toBeVisible({
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
      await expect(blockLocator(page, 1).locator(".inline-mention").first()).toContainText(
        mentionTargetTitle,
        {
          timeout: 10_000
        }
      );
      await expect(blockLocator(page, 2)).toHaveAttribute("data-content", "QUOTE", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 4)).toHaveAttribute("data-content", "LIST", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 5)).toHaveAttribute("data-content", "ORDERED_LIST", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 6)).toHaveAttribute("data-content", "CHECKLIST", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 7)).toHaveAttribute("data-content", "CALLOUT", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 8)).toHaveAttribute("data-content", "CODE", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 9)).toHaveAttribute("data-content", "DIVIDER", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 10)).toHaveAttribute(
        "data-content",
        "DOUBLE_DIVIDER",
        {
          timeout: 10_000
        }
      );
      await expect(blockLocator(page, 11)).toHaveAttribute("data-content", "HEADING3", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 12)).toHaveAttribute("data-content", "HEADING4", {
        timeout: 10_000
      });
      await expect(
        blockLocator(page, 12)
      ).toContainText(quaternaryHeading, {
        timeout: 10_000
      });
      await expect(blockLocator(page, 13)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(
        blockLocator(page, 13).getByPlaceholder("Type or paste embed code/link here")
      ).toBeVisible({
        timeout: 10_000
      });
      await expect(blockLocator(page, 13)).toContainText("Choose from library", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 14)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 14).locator("img").first()).toBeVisible({
        timeout: 15_000
      });
      await expect(blockLocator(page, 15)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 15)).toContainText("ping", {
        timeout: 15_000
      });
      await expect(blockLocator(page, 16)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 16)).toContainText("Lorem_ipsum.pdf", {
        timeout: 15_000
      });
      await expect(pdfViewerLocator(page, 16)).toBeVisible({
        timeout: 15_000
      });
      await expect(blockLocator(page, 17)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 17)).toContainText("README.md", {
        timeout: 15_000
      });
      await expect(blockLocator(page, 18)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 18)).toContainText(collectionName, {
        timeout: 15_000
      });
      await expect(blockLocator(page, 19)).toHaveAttribute("data-content", "MEDIA_GRID", {
        timeout: 10_000
      });
      await expect(blockLocator(page, 19).locator("img").first()).toBeVisible({
        timeout: 15_000
      });

      await captureStep(page, artifactDir, "markdown-node-reopened");
      return {
        nodeId,
        snapshot
      };
    });
  } finally {
    await appendProgress(artifactDir, "finalize.start");
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      nodeTitle,
      mentionTargetTitle,
      primaryHeading,
      secondaryHeading,
      tertiaryHeading,
      paragraphText,
      quoteText,
      listText,
      orderedListText,
      checklistText,
      calloutText,
      codeText,
      steps,
      browserConsole,
      pageErrors,
      requestFailures,
      appLogs: await flushAppLogs(page)
    };

    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifact, null, 2),
      "utf8"
    );
    await appendProgress(artifactDir, "result.written");
    await page.close().catch(() => null);
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
    await appendProgress(artifactDir, "browser.closed");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

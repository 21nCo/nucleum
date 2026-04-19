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
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface ProbeStepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ProbeArtifact {
  runId: string;
  project: ProjectName;
  baseURL: string;
  webNodeTitle: string;
  youtubeNodeTitle: string;
  webPageUrl: string;
  youtubeUrl: string;
  steps: Record<string, ProbeStepResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-markdown-url-embed-deep-dive"
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

async function maybeWait(page: Page, ms: number = 900) {
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
  await maybeWait(page, 1200);

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

function blockListLocator(page: Page) {
  return page.locator('#mdContent > div[id^="md-block-"]');
}

function blockLocator(page: Page, index: number) {
  return blockListLocator(page).nth(index);
}

function blockEditor(page: Page, index: number) {
  return blockLocator(page, index).locator("[contenteditable]").first();
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

async function waitForBlockType(page: Page, index: number, type: string) {
  await expect(blockLocator(page, index)).toHaveAttribute("data-content", type, {
    timeout: 15_000
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
  await item.click({ timeout: 5_000 });
  await maybeWait(page, 600);
}

async function convertCurrentBlockBySlash(
  page: Page,
  index: number,
  query: string,
  label: string,
  type: string
) {
  await focusBlock(page, index);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await maybeWait(page, 150);
  await page.keyboard.press("Backspace");
  await maybeWait(page, 250);
  await page.keyboard.type(query, { delay: 25 });
  await chooseBlockBrowserItem(page, label);
  await waitForBlockType(page, index, type);
  await maybeWait(page, 600);
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
  const webNodeTitle = `MarkdownWebEmbed${token}`;
  const youtubeNodeTitle = `MarkdownYoutubeEmbed${token}`;
  const webPageUrl = "https://medium.com/";
  const youtubeUrl = "https://www.youtube.com/watch?v=SeWdndc7y4A";
  const steps: ProbeArtifact["steps"] = {};

  await fs.mkdir(artifactDir, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false"
  });
  const context = await browser.newContext({
    storageState: await fs
      .access(authPath)
      .then(() => authPath)
      .catch(() => undefined)
  });
  const page = await context.newPage();

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? String(error));
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
    console.log(`[markdown-url-embed-deep-dive] start:${name}`);
    try {
      const details = (await handler()) ?? {};
      steps[name] = { success: true, details };
      console.log(`[markdown-url-embed-deep-dive] success:${name}`);
    } catch (error) {
      steps[name] = { success: false, error: String(error) };
      console.log(
        `[markdown-url-embed-deep-dive] failure:${name} ${String(error)}`
      );
      await captureStep(page, artifactDir, `${name}-failure`).catch(() => null);
    }
  };

  try {
    await enterHomeSurface(page, baseURL, project);
    await captureStep(page, artifactDir, "home");

    await recordStep("createWebEmbedNode", async () => {
      await createNodeViaCapture(page, webNodeTitle, baseURL, project);
      return {};
    });

    await recordStep("openWebEmbedNode", async () => {
      await openNodeFromLibrary(page, baseURL, webNodeTitle);
      await ensureNodeSurface(page);
      await captureStep(page, artifactDir, "web-node-opened");
      return {
        nodeId: new URL(page.url()).searchParams.get("r")
      };
    });

    await recordStep("buildWebEmbed", async () => {
      await createGenericWebEmbed(page, 0, webPageUrl);
      await captureStep(page, artifactDir, "web-embed-created");
      return {};
    });

    await recordStep("reopenWebEmbedNode", async () => {
      const nodeId =
        typeof steps.openWebEmbedNode?.details?.nodeId === "string"
          ? steps.openWebEmbedNode.details.nodeId
          : undefined;
      if (!nodeId) {
        throw new Error("Markdown node id was not captured during openWebEmbedNode");
      }
      await waitForPersistenceSettle(page);
      await openNodeFromLibraryById(page, baseURL, nodeId);
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
      await captureStep(page, artifactDir, "web-node-reopened");
      return { nodeId };
    });

    await recordStep("createYoutubeEmbedNode", async () => {
      await enterHomeSurface(page, baseURL, project);
      await createNodeViaCapture(page, youtubeNodeTitle, baseURL, project);
      return {};
    });

    await recordStep("openYoutubeEmbedNode", async () => {
      await openNodeFromLibrary(page, baseURL, youtubeNodeTitle);
      await ensureNodeSurface(page);
      await captureStep(page, artifactDir, "youtube-node-opened");
      return {
        nodeId: new URL(page.url()).searchParams.get("r")
      };
    });

    await recordStep("buildYoutubeEmbed", async () => {
      await createYoutubeEmbed(page, 0, youtubeUrl);
      await captureStep(page, artifactDir, "youtube-embed-created");
      return {};
    });

    await recordStep("reopenYoutubeEmbedNode", async () => {
      const nodeId =
        typeof steps.openYoutubeEmbedNode?.details?.nodeId === "string"
          ? steps.openYoutubeEmbedNode.details.nodeId
          : undefined;
      if (!nodeId) {
        throw new Error("Markdown node id was not captured during openYoutubeEmbedNode");
      }
      await waitForPersistenceSettle(page);
      await openNodeFromLibraryById(page, baseURL, nodeId);
      await ensureNodeSurface(page);
      await expect(blockLocator(page, 0)).toHaveAttribute("data-content", "EMBED", {
        timeout: 10_000
      });
      await expect(
        blockLocator(page, 0).locator('[id^="player-container-"]').first()
      ).toBeVisible({
        timeout: 15_000
      });
      await captureStep(page, artifactDir, "youtube-node-reopened");
      return { nodeId };
    });
  } finally {
    const artifact: ProbeArtifact = {
      runId,
      project,
      baseURL,
      webNodeTitle,
      youtubeNodeTitle,
      webPageUrl,
      youtubeUrl,
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
    await page.close().catch(() => null);
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

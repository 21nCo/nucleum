import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import {
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface StepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  sourceNodeTitle: string;
  targetNodeTitle: string;
  steps: Record<string, StepResult>;
  browserConsole: Array<{ type: string; text: string; args?: unknown[] }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-capture-links-deep-dive"
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

async function wait(page: Page, ms: number = 1000) {
  await page.waitForTimeout(ms);
}

async function createNodeViaCapture(page: Page, title: string) {
  const captureButton = page.getByRole("button", { name: /^Capture$/i }).first();
  await captureButton.click({ timeout: 10_000 });
  const titleEditor = page.locator("#capture-title").first();
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();
  await titleEditor.waitFor({ state: "visible", timeout: 15_000 });
  await contenteditable.waitFor({ state: "visible", timeout: 15_000 });
  await titleEditor.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await contenteditable.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await wait(page, 1200);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ timeout: 10_000 });
  await wait(page, 1500);

  const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => null);
    await wait(page, 800);
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await wait(page, 500);
  }
}

async function openNodesLibrary(page: Page, baseURL: string) {
  await page.goto(new URL("/library?resource=node&type=all", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await wait(page, 1200);
}

async function openNodeFromLibrary(page: Page, baseURL: string, title: string) {
  await openNodesLibrary(page, baseURL);
  const row = page.locator(".resource").filter({ hasText: title }).first();
  const fallback = page.getByText(title, { exact: false }).first();
  const target = (await row.isVisible().catch(() => false)) ? row : fallback;
  await target.waitFor({ state: "visible", timeout: 20_000 });
  await target.click({ timeout: 5_000 });
  await wait(page, 1800);
}

async function openNodePanel(page: Page, name: RegExp) {
  const tab = page.getByRole("tab", { name }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ timeout: 5_000 });
    await wait(page, 700);
    return;
  }
  const button = page.getByRole("button", { name }).first();
  await button.click({ timeout: 5_000 });
  await wait(page, 700);
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const token = String(Date.now()).slice(-6);
  const sourceNodeTitle = `CaptureLinksSource-${token}`;
  const targetNodeTitle = `CaptureLinksTarget-${token}`;

  await fs.mkdir(artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    storageState: (await fs
      .access(getAuthPath(project))
      .then(() => getAuthPath(project))
      .catch(() => undefined)) as string | undefined
  });

  await context.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("offlineSessionId")) {
        const value =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem("offlineSessionId", value);
      }
    } catch {}
  });

  const page = await context.newPage();
  const browserConsole: ArtifactData["browserConsole"] = [];
  const pageErrors: string[] = [];
  const requestFailures: ArtifactData["requestFailures"] = [];
  const steps: ArtifactData["steps"] = {};

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await createNodeViaCapture(page, targetNodeTitle);

    try {
      const captureButton = page.getByRole("button", { name: /^Capture$/i }).first();
      await captureButton.click({ timeout: 10_000 });
      const titleEditor = page.locator("#capture-title").first();
      const contenteditable = page
        .locator('[data-testid="capture-editor"] [contenteditable]')
        .first();
      await titleEditor.waitFor({ state: "visible", timeout: 15_000 });
      await contenteditable.waitFor({ state: "visible", timeout: 15_000 });
      await titleEditor.click({ timeout: 5_000 });
      await page.keyboard.type(sourceNodeTitle, { delay: 20 });
      await contenteditable.click({ timeout: 5_000 });
      await page.keyboard.type(sourceNodeTitle, { delay: 20 });
      await wait(page, 1000);

      const linksToggle = page
        .getByRole("button", { name: /Links/i })
        .or(page.getByText(/^Links$/i).locator("xpath=ancestor-or-self::button[1]").first())
        .first();
      await linksToggle.click({ timeout: 5_000 });
      await wait(page, 1000);

      const loopErrorAfterOpen = pageErrors.some((message) =>
        message.includes("effect_update_depth_exceeded")
      );
      if (loopErrorAfterOpen) {
        throw new Error("Opening capture links triggered effect_update_depth_exceeded");
      }

      const searchInput = page
        .getByPlaceholder(/Link to a node or add to a collection/i)
        .first();
      await searchInput.waitFor({ state: "visible", timeout: 15_000 });
      await searchInput.fill(targetNodeTitle);
      await wait(page, 1500);

      const resultItem = page.getByText(targetNodeTitle, { exact: false }).first();
      await resultItem.waitFor({ state: "visible", timeout: 15_000 });
      await resultItem.click({ timeout: 5_000 });
      await wait(page, 1500);
      await captureStep(page, artifactDir, "01-capture-links");

      const saveBtn = page
        .getByTestId("capture-save-button")
        .or(page.getByRole("button", { name: /^Save$/i }))
        .first();
      await saveBtn.click({ timeout: 10_000 });
      await wait(page, 1500);

      steps.captureLinking = {
        success: !pageErrors.some((message) =>
          message.includes("effect_update_depth_exceeded")
        ),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30),
          url: page.url()
        },
        error: pageErrors.some((message) =>
          message.includes("effect_update_depth_exceeded")
        )
          ? "Capture linking flow triggered effect_update_depth_exceeded"
          : undefined
      };
      if (!steps.captureLinking.success) {
        throw new Error(steps.captureLinking.error ?? "Capture link flow failed");
      }
    } catch (error) {
      steps.captureLinking = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, sourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const linkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const linkedVisible = await linkedItem.isVisible().catch(() => false);
      await captureStep(page, artifactDir, "02-reopened-links");
      steps.reopenNodeLinks = {
        success: linkedVisible,
        details: {
          linkedVisible,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30),
          url: page.url()
        },
        error: linkedVisible
          ? undefined
          : "Linked item did not appear in saved node links panel"
      };
      if (!steps.reopenNodeLinks.success) {
        throw new Error(steps.reopenNodeLinks.error ?? "Saved node links missing");
      }
    } catch (error) {
      steps.reopenNodeLinks = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30),
          url: page.url()
        }
      };
      throw error;
    }
  } finally {
    const appLogs = await flushAppLogs(page);
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      sourceNodeTitle,
      targetNodeTitle,
      steps,
      browserConsole,
      pageErrors,
      requestFailures,
      appLogs
    };
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifact, null, 2),
      "utf8"
    );
    await browser.close();
  }
}

void main();

import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
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
  noteText: string;
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
  "impromptu-calendar-right-panel-deep-dive"
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

async function openCalendarNotes(page: Page, baseURL: string) {
  await page.goto(new URL("/calendar", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await wait(page, 1500);
  const columnsView = page.getByRole("button", { name: /^Columns$/i }).first();
  if (await columnsView.isVisible().catch(() => false)) {
    await columnsView.click({ timeout: 5_000 }).catch(() => null);
    await wait(page, 800);
  }
  const monthView = page.getByRole("button", { name: /^(?:M|Month|Months)$/i }).first();
  if (await monthView.isVisible().catch(() => false)) {
    await monthView.click({ timeout: 5_000 }).catch(() => null);
    await wait(page, 500);
  }
  const notesButton = page
    .getByRole("button", { name: /^Notes$/i })
    .or(page.getByRole("tab", { name: /^Notes$/i }))
    .first();
  await notesButton.waitFor({ state: "visible", timeout: 15_000 });
  await notesButton.click({ timeout: 5_000 });
  await wait(page, 1200);
}

async function typeCalendarNote(page: Page, noteText: string) {
  const editor = page
    .getByPlaceholder(/Start typing or use \/ to browse/i)
    .or(page.getByRole("textbox", { name: /Markdown editor/i }))
    .first();
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click({ timeout: 5_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
  await page.keyboard.type(noteText, { delay: 20 });
  await wait(page, 1600);
}

async function openCalendarActivity(page: Page) {
  const activityButton = page
    .getByRole("button", { name: /^Activity$/i })
    .or(page.getByRole("tab", { name: /^Activity$/i }))
    .first();
  await activityButton.waitFor({ state: "visible", timeout: 15_000 });
  await activityButton.click({ timeout: 5_000 });
  await wait(page, 1500);
}

async function countActivityItems(page: Page) {
  return await page
    .locator("button")
    .filter({
      has: page.locator("span.text-b3.text-fgs3.whitespace-nowrap")
    })
    .count();
}

async function collectActivityRowTexts(page: Page) {
  const rows = page
    .locator("button")
    .filter({
      has: page.locator("span.text-b3.text-fgs3.whitespace-nowrap")
    });
  const count = await rows.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const text = ((await rows.nth(i).textContent().catch(() => "")) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) texts.push(text);
  }
  return texts;
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const noteText = `Calendar note ${Date.now()}`;

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

    try {
      await openCalendarNotes(page, baseURL);
      await typeCalendarNote(page, noteText);
      await captureStep(page, artifactDir, "01-notes");
      steps.openNotesAndType = {
        success: true,
        details: {
          url: page.url(),
          pageErrors: [...pageErrors]
        }
      };
    } catch (error) {
      steps.openNotesAndType = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          url: page.url(),
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20)
        }
      };
      throw error;
    }

    try {
      await openCalendarActivity(page);
      const loopError = pageErrors.some((message) =>
        message.includes("effect_update_depth_exceeded")
      );
      await captureStep(page, artifactDir, "02-activity");
      steps.switchToActivity = {
        success: !loopError,
        details: {
          loopError,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30),
          url: page.url()
        },
        error: loopError
          ? "Switching from notes to activity triggered effect_update_depth_exceeded"
          : undefined
      };
      if (!steps.switchToActivity.success) {
        throw new Error(steps.switchToActivity.error ?? "Calendar activity switch failed");
      }
    } catch (error) {
      steps.switchToActivity = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          url: page.url(),
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30)
        }
      };
      throw error;
    }

    try {
      const beforeCount = await countActivityItems(page);
      const beforeTexts = await collectActivityRowTexts(page);
      await openCalendarActivity(page);
      await openCalendarActivity(page);
      const afterCount = await countActivityItems(page);
      const afterTexts = await collectActivityRowTexts(page);
      const duplicated =
        afterCount > beforeCount || afterTexts.length > new Set(afterTexts).size;
      await captureStep(page, artifactDir, "03-activity-reselected");
      steps.reselectActivity = {
        success: !duplicated,
        details: {
          beforeCount,
          afterCount,
          beforeTexts,
          afterTexts,
          duplicated,
          pageErrors: [...pageErrors],
          url: page.url()
        },
        error: duplicated ? "Activity items duplicated after reselecting panel" : undefined
      };
      if (!steps.reselectActivity.success) {
        throw new Error(steps.reselectActivity.error ?? "Activity duplication failed");
      }
    } catch (error) {
      steps.reselectActivity = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          url: page.url(),
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-30)
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
      noteText,
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

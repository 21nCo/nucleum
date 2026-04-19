import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import {
  captureConsole,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  timestamp,
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
  steps: Record<string, StepResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-calendar-overview-deep-dive"
);

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

async function openCalendarOverview(page: Page, baseURL: string, project: ProjectName) {
  await page.goto(new URL("/calendar", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(5_000);

  const continueOffline = page
    .getByRole("button", { name: /Continue (using )?offline/i })
    .first();
  if (await continueOffline.isVisible().catch(() => false)) {
    await continueOffline.click({ timeout: 10_000 });
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    await page.waitForTimeout(4_000);
  }

  const columnsToggle = page.getByRole("button", { name: /^Columns$/i }).first();
  if (await columnsToggle.isVisible().catch(() => false)) {
    await columnsToggle.click({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
  }

  const yearScaleToggle = page.getByRole("button", { name: /^Year$/i }).first();
  if (await yearScaleToggle.isVisible().catch(() => false)) {
    await yearScaleToggle.click({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
  }

  const timelinePanel = page.locator('button[aria-label="Timeline"]').first();
  await expect(timelinePanel).toBeVisible({ timeout: 15_000 });
  const overviewPanel = page.locator('button[aria-label="Overview"]').first();
  await expect(overviewPanel).toBeVisible({ timeout: 15_000 });
  await overviewPanel.click({ timeout: 10_000 });
  await expect(page.getByText(/On this day/i).first()).toBeVisible({
    timeout: 15_000
  });
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);

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
      const current = window.localStorage.getItem("offlineSessionId");
      if (!current) {
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
    try {
      await openCalendarOverview(page, baseURL, project);
      await captureStep(page, artifactDir, "01-calendar-overview");
      const errorPaneVisible = await page
        .getByText(/^Something went wrong\.?$/i)
        .first()
        .isVisible()
        .catch(() => false);
      const onThisDayVisible = await page
        .getByText(/On this day/i)
        .first()
        .isVisible()
        .catch(() => false);

      steps.openCalendarOverview = {
        success: pageErrors.length === 0 && onThisDayVisible && !errorPaneVisible,
        details: {
          pageErrors: [...pageErrors],
          errorPaneVisible,
          onThisDayVisible,
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        },
        error:
          pageErrors.length > 0
            ? `Unexpected page errors: ${pageErrors.join(" | ")}`
            : errorPaneVisible
              ? "Calendar Overview rendered the error pane above On this day"
              : !onThisDayVisible
                ? "Calendar Overview did not render On this day"
                : undefined
      };

      if (pageErrors.length > 0 || errorPaneVisible || !onThisDayVisible) {
        throw new Error(
          steps.openCalendarOverview.error ??
            "Calendar Overview did not render correctly"
        );
      }
    } catch (error) {
      steps.openCalendarOverview = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
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

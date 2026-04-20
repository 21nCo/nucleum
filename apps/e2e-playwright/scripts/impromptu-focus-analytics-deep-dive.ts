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
  "impromptu-focus-analytics-deep-dive"
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

async function openFocusOverview(page: Page, baseURL: string) {
  await page.goto(new URL("/overview?rview-tab=focus", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("tab", { name: /^All$/i }).first()).toBeVisible({
    timeout: 15_000
  });
}

async function injectMalformedAnalyticsConfig(page: Page) {
  await page.evaluate(async () => {
    const mod = await import(
      "/@fs/Users/serro/.codex/worktrees/0ac5/nucleus/client/products/pointron/analytics/analytics.store.ts"
    );
    await mod.analyticsConfigStore.modify({
      pages: [
        {
          id: "broken-page",
          label: "Broken",
          cards: [{ id: "broken-card" }]
        }
      ]
    });
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
    storageState: (await fs
      .access(getAuthPath(project))
      .then(() => getAuthPath(project))
      .catch(() => undefined)) as string | undefined
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
      await openFocusOverview(page, baseURL);
      await captureStep(page, artifactDir, "01-direct-focus-overview");
      steps.openDirectRoute = {
        success: true,
        details: {
          pageErrors: [...pageErrors]
        }
      };
    } catch (error) {
      steps.openDirectRoute = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }

    try {
      await injectMalformedAnalyticsConfig(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await expect(
        page.getByText(/No data available|Geez Something went wrong!|Focus/i).first()
      ).toBeVisible({ timeout: 15_000 });
      await captureStep(page, artifactDir, "02-malformed-config-reload");
      steps.reloadWithMalformedConfig = {
        success: pageErrors.length === 0,
        details: {
          pageErrors: [...pageErrors]
        },
        error:
          pageErrors.length > 0
            ? `Unexpected page errors: ${pageErrors.join(" | ")}`
            : undefined
      };
      if (pageErrors.length > 0) {
        throw new Error(`Unexpected page errors: ${pageErrors.join(" | ")}`);
      }
    } catch (error) {
      steps.reloadWithMalformedConfig = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
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

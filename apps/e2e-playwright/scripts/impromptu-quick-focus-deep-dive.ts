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
  timestamp,
  type ProjectName
} from "./runtime";
import { runCommand } from "../tests/utils/helpers";

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
  goalName: string;
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
  "impromptu-quick-focus-deep-dive"
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

async function maybeWait(page: Page, ms: number = 1_000) {
  await page.waitForTimeout(ms);
}

async function readSessionSnapshot(page: Page) {
  return page.evaluate(async () => {
    const databases =
      typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : [];
    const candidateNames = databases
      .map((database) => database.name)
      .filter((name): name is string => !!name);

    const dbName =
      candidateNames.find((name) => /-1$/.test(name)) ?? candidateNames[0];
    if (!dbName) {
      return null;
    }

    const value = await new Promise<any>((resolve, reject) => {
      const openRequest = indexedDB.open(dbName);
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const db = openRequest.result;
        const transaction = db.transaction("kv", "readonly");
        const store = transaction.objectStore("kv");
        const getRequest = store.get("kv:pointSessionSnapshotv2");
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          resolve(getRequest.result ?? null);
          db.close();
        };
      };
    });

    return value;
  });
}

async function createGoal(page: Page, goalName: string) {
  await runCommand(page, "Create a new goal");
  const goalNameInput = page.getByTestId("goal-name-input").first();
  await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await goalNameInput.fill(goalName);
  await page.keyboard.press("Enter");
  await goalNameInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await maybeWait(page, 700);
}

async function pinGoal(page: Page, goalName: string) {
  await runCommand(page, "Pin a goal to quick focus");
  const pinSearchInput = page.getByTestId("command-bar-input").first();
  await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
  await pinSearchInput.fill(goalName);
  await maybeWait(page, 800);
  await page.keyboard.press("Enter");
  await pinSearchInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
}

function getPinnedGoal(page: Page, goalName: string) {
  return page
    .getByTestId("quick-focus-panel")
    .first()
    .locator("button")
    .filter({ hasText: goalName })
    .first();
}

function getFocusWidget(page: Page) {
  return page
    .locator("button")
    .filter({ hasText: /(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})/ })
    .first();
}

async function openFocus(page: Page) {
  const quickFocusSearch = page.getByTestId("quick-focus-search").first();
  const isAlreadyVisible = await quickFocusSearch.isVisible().catch(() => false);
  if (!isAlreadyVisible) {
    await page.getByRole("button", { name: /^Focus$/i }).first().click({
      timeout: 5_000
    });
  }
  await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const goalName = `Probe quick focus ${Date.now()}`;

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

    await captureStep(page, artifactDir, "00-home");

    try {
      await openFocus(page);
      await captureStep(page, artifactDir, "01-open-focus");
      steps.openFocus = { success: true };
    } catch (error) {
      steps.openFocus = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }

    try {
      await createGoal(page, goalName);
      await pinGoal(page, goalName);
      await openFocus(page);
      const quickFocusSearch = page.getByTestId("quick-focus-search").first();
      await quickFocusSearch.fill(goalName);
      await maybeWait(page, 1_000);
      const pinnedGoal = getPinnedGoal(page, goalName);
      await pinnedGoal.waitFor({ state: "visible", timeout: 15_000 });
      await captureStep(page, artifactDir, "02-pinned-goal");
      steps.pinGoal = { success: true };
    } catch (error) {
      steps.pinGoal = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }

    let timerTextBeforeReload = "";
    let persistedSnapshotBeforeReload: any = null;
    try {
      await getPinnedGoal(page, goalName).click({ timeout: 5_000 });
      const focusWidget = getFocusWidget(page);
      await focusWidget.waitFor({ state: "visible", timeout: 15_000 });
      timerTextBeforeReload = (await focusWidget.textContent())?.trim() ?? "";
      persistedSnapshotBeforeReload = await readSessionSnapshot(page).catch(
        () => null
      );
      await captureStep(page, artifactDir, "03-started-focus");
      steps.startFocus = {
        success: !timerTextBeforeReload.includes("NaN"),
        details: { timerTextBeforeReload, persistedSnapshotBeforeReload }
      };
      if (timerTextBeforeReload.includes("NaN")) {
        throw new Error(`Invalid timer text before reload: ${timerTextBeforeReload}`);
      }
    } catch (error) {
      steps.startFocus = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: { timerTextBeforeReload }
      };
      throw error;
    }

    let timerTextAfterReload = "";
    let persistedSnapshotAfterReload: any = null;
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await maybeWait(page, 2_000);
      persistedSnapshotAfterReload = await readSessionSnapshot(page).catch(
        () => null
      );
      const restoredFocusWidget = getFocusWidget(page);
      await restoredFocusWidget.waitFor({ state: "visible", timeout: 15_000 });
      timerTextAfterReload = (await restoredFocusWidget.textContent())?.trim() ?? "";
      await captureStep(page, artifactDir, "04-reloaded-focus");
      steps.reloadFocus = {
        success: !timerTextAfterReload.includes("NaN"),
        details: { timerTextAfterReload, persistedSnapshotAfterReload }
      };
      if (timerTextAfterReload.includes("NaN")) {
        throw new Error(`Invalid timer text after reload: ${timerTextAfterReload}`);
      }
    } catch (error) {
      steps.reloadFocus = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: { timerTextAfterReload, persistedSnapshotAfterReload }
      };
      throw error;
    }
  } finally {
    const appLogs = await flushAppLogs(page);
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      goalName,
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
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

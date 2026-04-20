import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import {
  addCollectionThroughCollectionsLane,
  expectCollectionRecordOpenedFromLane,
  expectCollectionTagAbsent,
  expectCollectionTagVisible,
  openCollectionFromCollectionsLane,
  removeCollectionThroughCollectionsLane
} from "../tests/utils/collections-lane";
import {
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  runCommand,
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
  goalName: string;
  collectionName: string;
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
  "impromptu-goal-collections-lane-deep-dive"
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

async function maybeWait(page: Page, ms: number = 900) {
  await page.waitForTimeout(ms);
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

async function openGoalFromLibrary(
  page: Page,
  baseURL: string,
  goalName: string
) {
  await page.goto(
    new URL("/library?resource=goal&type=all", baseURL).toString(),
    { waitUntil: "domcontentloaded" }
  );
  await maybeWait(page, 1_200);
  const row = page.locator(".resource").filter({ hasText: goalName }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1_400);
}

async function verifyGoalCollectionState(
  page: Page,
  baseURL: string,
  goalName: string,
  collectionName: string,
  expected: "linked" | "unlinked"
) {
  await openGoalFromLibrary(page, baseURL, goalName);
  if (expected === "linked") {
    await expectCollectionTagVisible(page, collectionName);
    return { linked: true };
  }
  await expectCollectionTagAbsent(page, collectionName);
  return { linked: false };
}

function assertNoPageErrors(
  pageErrors: string[],
  context: string
) {
  if (pageErrors.length === 0) return;
  throw new Error(
    `${context} surfaced page errors:\n${pageErrors.join("\n\n")}`
  );
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
  const token = String(Date.now()).slice(-6);
  const goalName = `GoalCL-${token}`;
  const collectionName = `GCol-${token}`;
  const steps: ArtifactData["steps"] = {};

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
    try {
      const details = (await handler()) ?? {};
      steps[name] = {
        success: true,
        details
      };
    } catch (error) {
      steps[name] = {
        success: false,
        error: String(error)
      };
      await captureStep(page, artifactDir, `${name}-failure`).catch(() => null);
    }
  };

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await captureStep(page, artifactDir, "home");

    await recordStep("createGoal", async () => {
      await createGoal(page, goalName);
      return {};
    });

    await recordStep("openGoal", async () => {
      await openGoalFromLibrary(page, baseURL, goalName);
      await captureStep(page, artifactDir, "goal-opened");
      return {};
    });

    await recordStep("addCollection", async () => {
      await addCollectionThroughCollectionsLane(page, collectionName);
      await expectCollectionTagVisible(page, collectionName);
      await captureStep(page, artifactDir, "goal-collection-added");
      return { linked: true };
    });

    await recordStep("reopenAfterAdd", async () => {
      const details = await verifyGoalCollectionState(
        page,
        baseURL,
        goalName,
        collectionName,
        "linked"
      );
      assertNoPageErrors(
        pageErrors,
        "Goal collections lane create/reopen flow"
      );
      await captureStep(page, artifactDir, "goal-reopened-linked");
      return details;
    });

    await recordStep("openCollectionFromLane", async () => {
      await openGoalFromLibrary(page, baseURL, goalName);
      await openCollectionFromCollectionsLane(page, collectionName);
      await expectCollectionRecordOpenedFromLane(page, collectionName);
      await captureStep(page, artifactDir, "goal-open-collection-from-lane");
      return { opened: true };
    });

    await recordStep("removeCollection", async () => {
      await openGoalFromLibrary(page, baseURL, goalName);
      await removeCollectionThroughCollectionsLane(page, collectionName);
      await expectCollectionTagAbsent(page, collectionName);
      await captureStep(page, artifactDir, "goal-collection-removed");
      return { linked: false };
    });

    await recordStep("reopenAfterRemove", async () => {
      const details = await verifyGoalCollectionState(
        page,
        baseURL,
        goalName,
        collectionName,
        "unlinked"
      );
      await captureStep(page, artifactDir, "goal-reopened-unlinked");
      return details;
    });
  } finally {
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      goalName,
      collectionName,
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

    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

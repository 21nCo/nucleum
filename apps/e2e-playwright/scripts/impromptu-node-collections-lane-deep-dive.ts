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
  nodeName: string;
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
  "impromptu-node-collections-lane-deep-dive"
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

async function createNode(page: Page, nodeName: string) {
  await runCommand(page, "Capture");
  const editor = page.getByTestId("capture-editor");
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click();
  await page.keyboard.type(nodeName, { delay: 25 });
  await page.waitForTimeout(300);
  const saveButton = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await saveButton.click({ timeout: 10_000 });
  await maybeWait(page, 1_200);
  const closeButton = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ timeout: 5_000 }).catch(() => null);
    await maybeWait(page, 700);
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await maybeWait(page, 500);
  }
}

async function openNodeFromLibrary(
  page: Page,
  baseURL: string,
  nodeName: string
) {
  await page.goto(
    new URL("/library?resource=node&type=all", baseURL).toString(),
    { waitUntil: "domcontentloaded" }
  );
  await maybeWait(page, 1_200);
  const row = page.locator(".resource").filter({ hasText: nodeName }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1_400);
}

async function verifyNodeCollectionState(
  page: Page,
  baseURL: string,
  nodeName: string,
  collectionName: string,
  expected: "linked" | "unlinked"
) {
  await openNodeFromLibrary(page, baseURL, nodeName);
  if (expected === "linked") {
    await expectCollectionTagVisible(page, collectionName);
    return { linked: true };
  }
  await expectCollectionTagAbsent(page, collectionName);
  return { linked: false };
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
  const nodeName = `NodeCL-${token}`;
  const collectionName = `NCol-${token}`;
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

    await recordStep("createNode", async () => {
      await createNode(page, nodeName);
      return {};
    });

    await recordStep("openNode", async () => {
      await openNodeFromLibrary(page, baseURL, nodeName);
      await captureStep(page, artifactDir, "node-opened");
      return {};
    });

    await recordStep("addCollection", async () => {
      await addCollectionThroughCollectionsLane(page, collectionName);
      await expectCollectionTagVisible(page, collectionName);
      await captureStep(page, artifactDir, "node-collection-added");
      return { linked: true };
    });

    await recordStep("reopenAfterAdd", async () => {
      const details = await verifyNodeCollectionState(
        page,
        baseURL,
        nodeName,
        collectionName,
        "linked"
      );
      await captureStep(page, artifactDir, "node-reopened-linked");
      return details;
    });

    await recordStep("openCollectionFromLane", async () => {
      await openNodeFromLibrary(page, baseURL, nodeName);
      await openCollectionFromCollectionsLane(page, collectionName);
      await expectCollectionRecordOpenedFromLane(page, collectionName);
      await captureStep(page, artifactDir, "node-open-collection-from-lane");
      return { opened: true };
    });

    await recordStep("removeCollection", async () => {
      await openNodeFromLibrary(page, baseURL, nodeName);
      await removeCollectionThroughCollectionsLane(page, collectionName);
      await expectCollectionTagAbsent(page, collectionName);
      await captureStep(page, artifactDir, "node-collection-removed");
      return { linked: false };
    });

    await recordStep("reopenAfterRemove", async () => {
      const details = await verifyNodeCollectionState(
        page,
        baseURL,
        nodeName,
        collectionName,
        "unlinked"
      );
      await captureStep(page, artifactDir, "node-reopened-unlinked");
      return details;
    });
  } finally {
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      nodeName,
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

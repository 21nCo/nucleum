import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import {
  LibraryTab,
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  getE2EProductCapabilities,
  getNavProductConfig,
  openLibraryResource,
  openNav,
  parseProject,
  runCommand,
  timestamp,
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface ResourceFlowResult {
  created: boolean;
  createdName?: string;
  createdBody?: string;
  visibleInLibrary?: boolean;
  reopened?: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface NavResult {
  label: string;
  success: boolean;
  url?: string;
  error?: string;
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  nav: NavResult[];
  resources: Record<string, ResourceFlowResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-surface-smoke"
);

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function captureStep(page: Page, artifactDir: string, name: string) {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: true
  });
}

async function closeIfVisible(page: Page, name: RegExp | string) {
  const locator =
    typeof name === "string"
      ? page.getByRole("button", { name }).first()
      : page.getByRole("button", { name }).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(800);
  }
}

async function isTaskRecordVisible(page: Page) {
  const taskInput = page.getByTestId("task-name-input");
  const closeBtn = page.getByRole("button", { name: /Close/i }).first();
  const maxBtn = page.getByRole("button", { name: /Maximize|Minimize/i }).first();
  const resourcePanel = page
    .locator("[data-panel-type], .border-t.border-x.border-brs3")
    .first();

  return (
    (await taskInput.isVisible().catch(() => false)) ||
    (await closeBtn.isVisible().catch(() => false)) ||
    (await maxBtn.isVisible().catch(() => false)) ||
    (await resourcePanel.isVisible().catch(() => false))
  );
}

async function tryOpenTaskRow(page: Page, taskName: string) {
  const row = page.locator(".resource").filter({ hasText: taskName }).first();
  const textLocator = page.getByText(taskName, { exact: false }).last();
  const clickTarget = (await row.isVisible().catch(() => false)) ? row : textLocator;
  await clickTarget.waitFor({ state: "visible", timeout: 10_000 });
  await clickTarget.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  if (await isTaskRecordVisible(page)) {
    return true;
  }

  await clickTarget.hover().catch(() => null);
  const openButton = page.getByRole("button", { name: /Open/i }).first();
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  return isTaskRecordVisible(page);
}

async function reopenViaCommandSearch(page: Page, query: string) {
  await runCommand(page, query);
  await page.waitForTimeout(1_500);
}

async function createCollectionFlow(
  page: Page,
  artifactDir: string
): Promise<ResourceFlowResult> {
  const collectionName = `Impromptu Collection ${Date.now()}`;
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(collectionName);
  const modal = page.locator("#collection_create");
  await modal.getByRole("button", { name: /Save.*Enter/i }).click({
    timeout: 5_000
  });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

  await openLibraryResource(page, LibraryTab.Collections);
  const row = page.getByText(collectionName, { exact: true }).first();
  const visibleInLibrary = await row.isVisible().catch(() => false);
  await captureStep(page, artifactDir, "collection-library");

  let reopened = false;
  if (visibleInLibrary) {
    await row.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
    reopened = await page
      .getByText(collectionName, { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    await captureStep(page, artifactDir, "collection-open");
  }

  await closeIfVisible(page, /^Close$/i);

  return {
    created: true,
    createdName: collectionName,
    visibleInLibrary,
    reopened
  };
}

async function createGoalFlow(
  page: Page,
  artifactDir: string
): Promise<ResourceFlowResult> {
  const goalName = `Impromptu Goal ${Date.now()}`;
  await runCommand(page, "Create a new goal");
  const goalNameInput = page.getByTestId("goal-name-input");
  await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await goalNameInput.fill(goalName);
  await page.keyboard.press("Enter");
  await goalNameInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(800);

  let visibleInLibrary = false;
  try {
    await openLibraryResource(page, LibraryTab.Goals);
    const row = page.getByRole("button").filter({ hasText: goalName }).first();
    visibleInLibrary = await row.isVisible().catch(() => false);
    await captureStep(page, artifactDir, "goal-library");

    let reopened = false;
    if (visibleInLibrary) {
      await row.click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
      reopened = await page
        .getByText(goalName, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "goal-open");
    } else {
      await reopenViaCommandSearch(page, goalName);
      reopened = await page
        .getByText(goalName, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "goal-open-search");
    }

    await closeIfVisible(page, /^Close$/i);

    return {
      created: true,
      createdName: goalName,
      visibleInLibrary,
      reopened
    };
  } catch {
    await reopenViaCommandSearch(page, goalName);
    const reopened = await page
      .getByText(goalName, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    await captureStep(page, artifactDir, "goal-open-search");
    await closeIfVisible(page, /^Close$/i);
    return {
      created: true,
      createdName: goalName,
      visibleInLibrary,
      reopened
    };
  }
}

async function createTaskFlow(
  page: Page,
  artifactDir: string
): Promise<ResourceFlowResult> {
  const taskName = `Impromptu Task ${Date.now()}`;
  await runCommand(page, "Create a new task");
  const taskNameInput = page.getByTestId("task-name-input");
  await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await taskNameInput.fill(taskName);
  await page.keyboard.press("Enter");
  await taskNameInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(800);

  let visibleInLibrary = false;
  try {
    await openLibraryResource(page, LibraryTab.Tasks);
    const row = page.locator(".resource").filter({ hasText: taskName }).first();
    const textLocator = page.getByText(taskName, { exact: false }).last();
    visibleInLibrary =
      (await row.isVisible().catch(() => false)) ||
      (await textLocator.isVisible().catch(() => false));
    await captureStep(page, artifactDir, "task-library");

    let reopened = false;
    if (visibleInLibrary) {
      reopened = await tryOpenTaskRow(page, taskName);
      await captureStep(page, artifactDir, "task-open");
    } else {
      await reopenViaCommandSearch(page, taskName);
      reopened = await isTaskRecordVisible(page);
      await captureStep(page, artifactDir, "task-open-search");
    }

    await closeIfVisible(page, /^Close$/i);

    return {
      created: true,
      createdName: taskName,
      visibleInLibrary,
      reopened
    };
  } catch {
    await reopenViaCommandSearch(page, taskName);
    const reopened = await page
      .getByText(taskName, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    await captureStep(page, artifactDir, "task-open-search");
    await closeIfVisible(page, /^Close$/i);
    return {
      created: true,
      createdName: taskName,
      visibleInLibrary,
      reopened
    };
  }
}

async function createNodeFlow(
  page: Page,
  artifactDir: string
): Promise<ResourceFlowResult> {
  const titleText = `Impromptu Node ${Date.now()}`;
  const bodyText = `Impromptu body ${Date.now()}`;

  await runCommand(page, "Capture");

  const titleInput = page.locator("#capture-title").first();
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(titleText).catch(async () => {
    await titleInput.click({ timeout: 5_000, force: true });
    await page.keyboard.type(titleText, { delay: 30 });
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);

  const editor = page
    .getByTestId("capture-editor")
    .getByPlaceholder("Start typing to capture...")
    .or(
      page
        .getByTestId("capture-editor")
        .getByRole("textbox", {
          name: /Markdown editor|Start typing/i
        })
    )
    .first();
  const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
  const editorVisible = await editor.isVisible().catch(() => false);
  if (!editorVisible) {
    await markdownBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
  }
  await editor.waitFor({ state: "visible", timeout: 8_000 });
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable="true"]')
    .first();
  if (await contenteditable.isVisible().catch(() => false)) {
    await contenteditable.click({ timeout: 5_000, force: true });
  } else {
    await editor.click({ force: true });
  }
  await page.keyboard.type(bodyText, { delay: 30 });
  await page.waitForTimeout(1_200);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await saveBtn.click({ timeout: 10_000 });
  await page.waitForTimeout(5_000);
  await captureStep(page, artifactDir, "node-after-save");

  await closeIfVisible(page, /^Close$/i);
  await openLibraryResource(page, LibraryTab.Nodes);

  const titleLocator = page.getByText(titleText, { exact: false }).first();
  const bodyLocator = page.getByText(bodyText, { exact: false }).first();
  const visibleInLibrary = await titleLocator.isVisible().catch(() => false);
  const bodyVisibleInLibrary = await bodyLocator.isVisible().catch(() => false);
  await captureStep(page, artifactDir, "node-library");

  let reopened = false;
  if (visibleInLibrary) {
    await titleLocator.click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
    const titleVisibleInNode = await page
      .getByText(titleText, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    const bodyVisibleInNode = await page
      .getByText(bodyText, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    reopened = titleVisibleInNode && bodyVisibleInNode;
    await captureStep(page, artifactDir, "node-open");
  }

  return {
    created: true,
    createdName: titleText,
    createdBody: bodyText,
    visibleInLibrary,
    reopened,
    details: {
      bodyVisibleInLibrary
    }
  };
}

async function runNavChecks(
  page: Page,
  project: ProjectName,
  artifactDir: string
): Promise<NavResult[]> {
  const config = getNavProductConfig(project);
  const results: NavResult[] = [];
  for (const label of config.appMenuNavLabels) {
    try {
      await openNav(page, project, label);
      await captureStep(page, artifactDir, `nav-${safeName(label)}`);
      results.push({
        label,
        success: true,
        url: page.url()
      });
    } catch (error) {
      results.push({
        label,
        success: false,
        url: page.url(),
        error: String(error)
      });
    }
  }
  return results;
}

async function resetToStableSurface(
  page: Page,
  baseURL: string,
  project: ProjectName,
  artifactDir: string,
  stepName: string
) {
  await ensureInAppOnHome(page, baseURL, project);
  await page.waitForTimeout(600);
  await captureStep(page, artifactDir, stepName);
}

async function run() {
  const project = parseProject(process.argv.slice(2));
  const baseURL = getBaseURL(project);
  const capabilities = getE2EProductCapabilities(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  await fs.mkdir(artifactDir, { recursive: true });

  const browserConsole: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: Array<{ url: string; errorText: string }> = [];

  const contextOptions: Record<string, unknown> = {
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 }
  };

  try {
    await fs.access(getAuthPath(project));
    contextOptions.storageState = getAuthPath(project);
  } catch {}

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

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

  await page.route("**/*", (route) => {
    const reqUrl = route.request().url();
    if (/accounts\\.google\\.com/i.test(reqUrl)) {
      route.abort();
      return;
    }
    route.continue();
  });

  const artifactData: ArtifactData = {
    runId,
    project,
    baseURL,
    nav: [],
    resources: {},
    browserConsole,
    pageErrors,
    requestFailures,
    appLogs: ""
  };

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await captureStep(page, artifactDir, "home");

    artifactData.nav = await runNavChecks(page, project, artifactDir);

    await openNav(page, project, getNavProductConfig(project).appMenuNavLabels[0]);

    if (capabilities.resources.collections) {
      try {
        artifactData.resources.collection = await createCollectionFlow(
          page,
          artifactDir
        );
      } catch (error) {
        artifactData.resources.collection = {
          created: false,
          error: String(error)
        };
      } finally {
        await resetToStableSurface(
          page,
          baseURL,
          project,
          artifactDir,
          "reset-after-collection"
        );
      }
    }

    if (capabilities.resources.goals) {
      try {
        artifactData.resources.goal = await createGoalFlow(page, artifactDir);
      } catch (error) {
        artifactData.resources.goal = {
          created: false,
          error: String(error)
        };
      } finally {
        await resetToStableSurface(
          page,
          baseURL,
          project,
          artifactDir,
          "reset-after-goal"
        );
      }
    }

    if (capabilities.resources.tasks) {
      try {
        artifactData.resources.task = await createTaskFlow(page, artifactDir);
      } catch (error) {
        artifactData.resources.task = {
          created: false,
          error: String(error)
        };
      } finally {
        await resetToStableSurface(
          page,
          baseURL,
          project,
          artifactDir,
          "reset-after-task"
        );
      }
    }

    if (capabilities.resources.nodes) {
      try {
        artifactData.resources.node = await createNodeFlow(page, artifactDir);
      } catch (error) {
        artifactData.resources.node = {
          created: false,
          error: String(error)
        };
      } finally {
        await resetToStableSurface(
          page,
          baseURL,
          project,
          artifactDir,
          "reset-after-node"
        );
      }
    }

    artifactData.appLogs = await flushAppLogs(page);
    await fs.writeFile(
      path.join(artifactDir, "page.html"),
      await page.content(),
      "utf8"
    );
  } catch (error) {
    artifactData.appLogs = await flushAppLogs(page);
    await page.screenshot({
      path: path.join(artifactDir, "failure.png"),
      fullPage: true
    }).catch(() => undefined);
    await fs.writeFile(
      path.join(artifactDir, "error.txt"),
      String(error),
      "utf8"
    ).catch(() => undefined);
    throw error;
  } finally {
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifactData, null, 2),
      "utf8"
    );
    if (artifactData.appLogs) {
      await fs.writeFile(
        path.join(artifactDir, "app-logs.txt"),
        artifactData.appLogs,
        "utf8"
      );
    }
    await context.close();
    await browser.close();
  }

  console.log(JSON.stringify({ artifactDir, result: artifactData }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

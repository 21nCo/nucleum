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
  runCommand,
  timestamp,
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface GoalStepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  parentGoalName: string;
  childGoalName: string;
  grandchildGoalName: string;
  taskName: string;
  steps: Record<string, GoalStepResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-goal-record-deep-dive"
);

function exactTextPattern(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
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

async function maybeWait(page: Page, ms: number = 1_000) {
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

async function openGoalsLibrary(page: Page, baseURL: string) {
  await page.goto(
    new URL("/library?resource=goal&type=all", baseURL).toString(),
    { waitUntil: "domcontentloaded" }
  );
  await maybeWait(page, 1_200);
}

async function openGoalFromLibrary(
  page: Page,
  baseURL: string,
  goalName: string
) {
  await openGoalsLibrary(page, baseURL);
  const row = page.locator(".resource").filter({ hasText: goalName }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click({ timeout: 5_000 });
  await maybeWait(page, 1_500);
  await page.getByText(goalName).first().waitFor({
    state: "visible",
    timeout: 15_000
  });
}

async function switchGoalPanel(page: Page, label: string) {
  const tab = page.getByRole("tab", { name: exactTextPattern(label) }).first();
  await tab.waitFor({ state: "visible", timeout: 10_000 });
  await tab.click({ timeout: 5_000 });
  await maybeWait(page, 1_000);
}

async function resolveVisibleSubGoalInput(page: Page) {
  const candidates = [
    page.getByPlaceholder("Add new subgoal").first(),
    page.getByPlaceholder("Add a subgoal").first()
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  const visibleCandidate = page
    .locator('input[placeholder="Add new subgoal"], input[placeholder="Add a subgoal"]')
    .first();
  await visibleCandidate.waitFor({ state: "visible", timeout: 10_000 });
  return visibleCandidate;
}

async function showSubGoalsSurface(page: Page) {
  const tab = page.getByRole("tab", { name: exactTextPattern("Sub goals") }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ timeout: 5_000 });
    await maybeWait(page, 1_000);
  }
  await resolveVisibleSubGoalInput(page);
}

async function addSubGoal(page: Page, childGoalName: string) {
  await showSubGoalsSurface(page);
  const input = await resolveVisibleSubGoalInput(page);
  await input.fill(childGoalName);
  await page.keyboard.press("Enter");
  await maybeWait(page, 1_200);
  const item = page.getByRole("button", { name: new RegExp(childGoalName) }).first();
  await item.waitFor({ state: "visible", timeout: 15_000 });
}

async function openSubGoal(page: Page, childGoalName: string) {
  const item = page.getByRole("button", { name: new RegExp(childGoalName) }).first();
  await item.waitFor({ state: "visible", timeout: 15_000 });
  await item.click({ timeout: 5_000 });
  await maybeWait(page, 1_500);
  await page.getByText(childGoalName).first().waitFor({
    state: "visible",
    timeout: 15_000
  });
}

async function readBreadcrumbLabels(page: Page) {
  return page.locator("#breadcrumb-item-label").evaluateAll((elements) =>
    elements
      .map((element) => element.textContent?.trim() ?? "")
      .filter(Boolean)
  );
}

async function clickBreadcrumb(page: Page, label: string) {
  const breadcrumb = page.locator("#breadcrumb-item-label").filter({
    hasText: exactTextPattern(label)
  }).first();
  await breadcrumb.waitFor({ state: "visible", timeout: 10_000 });
  await breadcrumb.click({ timeout: 5_000 });
  await maybeWait(page, 1_200);
}

async function createTaskInGoal(page: Page, taskName: string) {
  await switchGoalPanel(page, "Tasks");
  const createTaskButton = page
    .getByRole("button", { name: /Create task|New task/i })
    .first();
  await createTaskButton.waitFor({ state: "visible", timeout: 15_000 });
  await createTaskButton.click({ timeout: 5_000 });
  const taskInput = page.getByTestId("task-name-input").first();
  await taskInput.waitFor({ state: "visible", timeout: 15_000 });
  await taskInput.fill(taskName);
  await page.keyboard.press("Enter");
  await maybeWait(page, 1_200);
  await resolveTaskRow(page, taskName);
}

async function openTaskFromGoal(page: Page, taskName: string) {
  const isTaskLibraryVisible = await page
    .locator("#task-library")
    .first()
    .isVisible()
    .catch(() => false);
  if (!isTaskLibraryVisible) {
    await switchGoalPanel(page, "Tasks");
  }
  const taskRow = await resolveTaskRow(page, taskName);
  await taskRow.click({ timeout: 5_000 });
  await maybeWait(page, 1_500);
}

async function assertTaskRecordVisible(page: Page, taskName: string) {
  const visible = await Promise.all([
    page.getByTestId("task-name-input").first().isVisible().catch(() => false),
    page.getByRole("textbox", { name: /Task name/i }).first().isVisible().catch(() => false),
    page.getByRole("heading", { name: new RegExp(taskName) }).first().isVisible().catch(() => false),
    page.getByRole("button", { name: /Close/i }).first().isVisible().catch(() => false)
  ]).then((values) => values.some(Boolean));
  if (!visible) {
    throw new Error("Task record page did not become visible");
  }
}

async function resolveTaskRow(page: Page, taskName: string, timeout: number = 15_000) {
  const rows = page.locator("#task-library .resource");
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const count = await rows.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      if (!(await row.isVisible().catch(() => false))) continue;

      const text = (await row.textContent().catch(() => "")) ?? "";
      if (text.includes(taskName)) return row;

      const input = row.locator('input[placeholder="Task name"]').first();
      const value = await input.inputValue().catch(() => "");
      if (value.trim() === taskName) return row;
    }
    await maybeWait(page, 300);
  }

  throw new Error(`Task row not found: ${taskName}`);
}

async function verifyGoalPersistence(
  page: Page,
  parentGoalName: string,
  childGoalName: string,
  grandchildGoalName: string,
  taskName: string
) {
  await showSubGoalsSurface(page);
  const childVisible = await page
    .getByRole("button", { name: new RegExp(childGoalName) })
    .first()
    .isVisible()
    .catch(() => false);
  let grandchildVisible = false;
  if (childVisible) {
    await openSubGoal(page, childGoalName);
    await showSubGoalsSurface(page);
    grandchildVisible = await page
      .getByRole("button", { name: new RegExp(grandchildGoalName) })
      .first()
      .isVisible()
      .catch(() => false);
    await clickBreadcrumb(page, parentGoalName);
  }
  await switchGoalPanel(page, "Tasks");
  const taskVisible = await resolveTaskRow(page, taskName, 10_000)
    .then(() => true)
    .catch(() => false);
  const titleVisible = await page
    .getByText(parentGoalName)
    .first()
    .isVisible()
    .catch(() => false);
  return {
    titleVisible,
    childVisible,
    grandchildVisible,
    taskVisible
  };
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
  const parentGoalName = `Impromptu Goal ${Date.now()}`;
  const childGoalName = `${parentGoalName} Child`;
  const grandchildGoalName = `${parentGoalName} Grandchild`;
  const taskName = `${parentGoalName} Task`;
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
    console.log(`[goal-record-deep-dive] start:${name}`);
    try {
      const details =
        (await Promise.race([
          handler(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Step timed out: ${name}`)),
              25_000
            )
          )
        ])) ?? {};
      steps[name] = {
        success: true,
        details
      };
      console.log(`[goal-record-deep-dive] success:${name}`);
    } catch (error) {
      steps[name] = {
        success: false,
        error: String(error)
      };
      console.log(`[goal-record-deep-dive] failure:${name} ${String(error)}`);
      await captureStep(page, artifactDir, `${name}-failure`).catch(() => null);
    }
  };

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await captureStep(page, artifactDir, "home");

    await recordStep("createParentGoal", async () => {
      await createGoal(page, parentGoalName);
      await captureStep(page, artifactDir, "goal-created");
      return {};
    });

    await recordStep("openParentGoal", async () => {
      await openGoalFromLibrary(page, baseURL, parentGoalName);
      await captureStep(page, artifactDir, "goal-opened");
      return {};
    });

    await recordStep("createSubGoal", async () => {
      await addSubGoal(page, childGoalName);
      await captureStep(page, artifactDir, "sub-goal-created");
      return {};
    });

    await recordStep("openSubGoal", async () => {
      await openSubGoal(page, childGoalName);
      const breadcrumbs = await readBreadcrumbLabels(page);
      await captureStep(page, artifactDir, "sub-goal-opened");
      return { breadcrumbs };
    });

    await recordStep("createGrandchildGoal", async () => {
      await addSubGoal(page, grandchildGoalName);
      await captureStep(page, artifactDir, "grandchild-goal-created");
      return {};
    });

    await recordStep("openGrandchildGoal", async () => {
      await openSubGoal(page, grandchildGoalName);
      const breadcrumbs = await readBreadcrumbLabels(page);
      await captureStep(page, artifactDir, "grandchild-goal-opened");
      return { breadcrumbs };
    });

    await recordStep("navigateGoalHierarchy", async () => {
      const breadcrumbsAtGrandchild = await readBreadcrumbLabels(page);
      await clickBreadcrumb(page, childGoalName);
      const breadcrumbsAtChild = await readBreadcrumbLabels(page);
      await clickBreadcrumb(page, parentGoalName);
      const breadcrumbsAtParent = await readBreadcrumbLabels(page);
      const parentVisible = await page
        .getByText(parentGoalName)
        .first()
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "goal-hierarchy");
      return {
        breadcrumbsAtGrandchild,
        breadcrumbsAtChild,
        breadcrumbsAtParent,
        parentVisible
      };
    });

    await recordStep("createGoalTask", async () => {
      await createTaskInGoal(page, taskName);
      await captureStep(page, artifactDir, "goal-task-created");
      return {};
    });

    await recordStep("openGoalTask", async () => {
      await openTaskFromGoal(page, taskName);
      await assertTaskRecordVisible(page, taskName);
      await captureStep(page, artifactDir, "goal-task-opened");
      return {};
    });

    await recordStep("reopenGoal", async () => {
      await openGoalFromLibrary(page, baseURL, parentGoalName);
      const persistence = await verifyGoalPersistence(
        page,
        parentGoalName,
        childGoalName,
        grandchildGoalName,
        taskName
      );
      await captureStep(page, artifactDir, "goal-reopened");
      return persistence;
    });
  } finally {
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      parentGoalName,
      childGoalName,
      grandchildGoalName,
      taskName,
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

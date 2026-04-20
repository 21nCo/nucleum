import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import {
  captureConsole,
  ensureOfflineSessionId,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  resolveRepoFsImportPath,
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
  goalFocusLabel: string;
  taskFocusLabel: string;
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
  "impromptu-focus-items-deep-dive"
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

async function openFocus(page: Page, baseURL: string) {
  await page.goto(new URL("/focus", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("button", { name: /Start focus/i }).first()).toBeVisible({
    timeout: 15_000
  });
  const directInput = page.getByPlaceholder(/start typing a goal or task name/i).first();
  const hasDirectInput = await directInput.isVisible().catch(() => false);
  if (!hasDirectInput) {
    await page
      .locator("button")
      .filter({ hasText: /add focus items|focus item/i })
      .first()
      .click({ timeout: 10_000, force: true });
  }
  await expect(directInput).toBeVisible({ timeout: 15_000 });
}

async function openFocusWithFallback(
  page: Page,
  baseURL: string,
  project: ProjectName
) {
  try {
    await openFocus(page, baseURL);
    return {
      method: "direct"
    } as const;
  } catch {
    await ensureInAppOnHome(page, baseURL, project);
    await openFocus(page, baseURL);
    return {
      method: "home-fallback"
    } as const;
  }
}

async function readFocusState(page: Page) {
  return page.evaluate(async (modulePaths) => {
    const mod = await import(modulePaths.sessionStorePath);
    const goalMod = await import(modulePaths.goalStorePath);
    const taskMod = await import(modulePaths.taskStorePath);
    let currentFocus: unknown = undefined;
    const unsubscribe = mod.currentFocusItem.subscribe((value: unknown) => {
      currentFocus = value;
    });
    unsubscribe();
    const focusItems = mod.focusItemsStore.get();
    const focusItemIds = Array.isArray(focusItems?.items)
      ? focusItems.items.map((item: { id: { toString(): string } }) => item.id.toString())
      : [];
    const goals = await goalMod.goalStore.selectMany(
      {
        filters: {
          id: focusItemIds
        }
      },
      {
        isIncludeSubItems: true,
        isExpand: true
      }
    );
    const tasks = await taskMod.taskStore.selectMany(
      {
        filters: {
          id: focusItemIds
        }
      },
      {
        isExpand: true
      }
    );
    return {
      focusItems,
      activeSession: mod.activeSession.get(),
      currentFocusItem: currentFocus,
      resolvedGoals: goals.map((goal: { id: { toString(): string }; label?: string }) => ({
        id: goal.id.toString(),
        label: goal.label ?? ""
      })),
      resolvedTasks: tasks.map((task: { id: { toString(): string }; label?: string }) => ({
        id: task.id.toString(),
        label: task.label ?? ""
      })),
      bodyText: document.body.innerText.slice(0, 2000)
    };
  }, {
    sessionStorePath: resolveRepoFsImportPath(
      "client/products/pointron/focus/session.store.ts"
    ),
    goalStorePath: resolveRepoFsImportPath(
      "client/components/goals/goal.store.ts"
    ),
    taskStorePath: resolveRepoFsImportPath(
      "client/components/tasks/task.store.ts"
    )
  });
}

async function readCurrentFocusRow(page: Page, label: string) {
  const row = page
    .locator(".bg-ccs1")
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();

  const isVisible = await row.isVisible().catch(() => false);
  const text = isVisible
    ? ((await row.textContent().catch(() => "")) ?? "")
    : "";

  return {
    isVisible,
    text: text.replace(/\s+/g, " ").trim()
  };
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const goalFocusLabel = `Probe focus goal ${Date.now()}`;
  const taskFocusLabel = `Probe focus task ${Date.now()}`;

  await fs.mkdir(artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: 1800,
      height: 1200
    },
    storageState: (await fs
      .access(getAuthPath(project))
      .then(() => getAuthPath(project))
      .catch(() => undefined)) as string | undefined
  });
  await context.addInitScript(ensureOfflineSessionId);
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
      const openResult = await openFocusWithFallback(page, baseURL, project);
      await captureStep(page, artifactDir, "01-open-focus");
      steps.openFocus = {
        success: true,
        details: openResult
      };
    } catch (error) {
      steps.openFocus = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }

    let beforeStartState: unknown = null;
    try {
      const focusInput = page
        .getByPlaceholder(/start typing a goal or task name/i)
        .first();
      await focusInput.fill(goalFocusLabel);
      await page.keyboard.press("Shift+Enter");
      await maybeWait(page, 1_500);
      beforeStartState = await readFocusState(page);
      await captureStep(page, artifactDir, "02-added-focus-item");
      const focusItemsCount =
        typeof beforeStartState === "object" &&
        beforeStartState &&
        "focusItems" in beforeStartState &&
        typeof (beforeStartState as any).focusItems === "object" &&
        Array.isArray((beforeStartState as any).focusItems.items)
          ? (beforeStartState as any).focusItems.items.length
          : 0;
      steps.addFocusItem = {
        success: focusItemsCount > 0,
        details: {
          beforeStartState,
          focusItemsCount
        },
        error:
          focusItemsCount > 0
            ? undefined
            : "Focus item was not present in store after creation"
      };
      if (focusItemsCount === 0) {
        throw new Error("Focus item was not present in store after creation");
      }
    } catch (error) {
      steps.addFocusItem = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          beforeStartState
        }
      };
      throw error;
    }

    let afterStartState: unknown = null;
    try {
      await page.getByRole("button", { name: /Start focus/i }).first().click({
        timeout: 10_000
      });
      await maybeWait(page, 2_000);
      afterStartState = await readFocusState(page);
      const currentGoalRow = await readCurrentFocusRow(page, goalFocusLabel);
      const noFocusItemsVisible = await page
        .getByText(/No focus items added\./i)
        .first()
        .isVisible()
        .catch(() => false);
      const runningFocusItemVisible = await page
        .getByText(goalFocusLabel, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "03-started-focus");
      steps.startFocus = {
        success:
          pageErrors.length === 0 &&
          !noFocusItemsVisible &&
          runningFocusItemVisible &&
          currentGoalRow.isVisible,
        details: {
          afterStartState,
          pageErrors: [...pageErrors],
          noFocusItemsVisible,
          runningFocusItemVisible,
          currentGoalRow
        },
        error:
          pageErrors.length > 0
            ? `Unexpected page errors: ${pageErrors.join(" | ")}`
            : noFocusItemsVisible
              ? "Running focus view still shows the empty focus-items pulse state"
              : !runningFocusItemVisible
                ? "Running focus view did not render the created focus item"
                : !currentGoalRow.isVisible
                  ? "Running focus view did not expose the current goal row"
                  : undefined
      };
      if (
        pageErrors.length > 0 ||
        noFocusItemsVisible ||
        !runningFocusItemVisible ||
        !currentGoalRow.isVisible
      ) {
        throw new Error(
          steps.startFocus.error ??
            "Running focus view did not render focus items correctly"
        );
      }
    } catch (error) {
      steps.startFocus = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          afterStartState,
          pageErrors: [...pageErrors]
        }
      };
      throw error;
    }

    let taskScenarioState: unknown = null;
    try {
      taskScenarioState = await page.evaluate(async ({ taskLabel, modulePaths }) => {
        const sessionMod = await import(modulePaths.sessionStorePath);
        const goalMod = await import(modulePaths.goalStorePath);

        await sessionMod.activeSession.close();
        for (const item of sessionMod.focusItemsStore.get().items) {
          await sessionMod.focusItemsStore.removeFocusItem(item.id);
        }

        const goal = await goalMod.goalStore.save({
          label: `Probe task goal ${Date.now()}`,
          isPreventOpenAfterCreate: true
        });
        if (!goal) {
          throw new Error("Failed to seed goal focus item");
        }

        await sessionMod.focusItemsStore.addGoal(goal.id);
        const createdTasks = await sessionMod.focusItemsStore.addNewTask(
          taskLabel,
          goal.id
        );
        const task = createdTasks?.[0];
        if (!task) {
          throw new Error("Failed to seed task focus item");
        }

        await sessionMod.activeSession.startSession();
        await sessionMod.activeSession.startTask(task.id);

        return {
          goalId: goal.id.toString(),
          goalLabel: goal.label,
          taskId: task.id.toString(),
          taskLabel: task.label
        };
      }, {
        taskLabel: taskFocusLabel,
        modulePaths: {
          sessionStorePath: resolveRepoFsImportPath(
            "client/products/pointron/focus/session.store.ts"
          ),
          goalStorePath: resolveRepoFsImportPath(
            "client/components/goals/goal.store.ts"
          )
        }
      });

      await page.goto(new URL("/focus", baseURL).toString(), {
        waitUntil: "domcontentloaded"
      });
      await maybeWait(page, 2_000);

      const currentTaskRow = await readCurrentFocusRow(page, taskFocusLabel);
      const taskVisible = await page
        .getByText(taskFocusLabel, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);

      await captureStep(page, artifactDir, "04-task-focus-feedback");
      steps.taskFocusFeedback = {
        success:
          pageErrors.length === 0 &&
          taskVisible &&
          currentTaskRow.isVisible,
        details: {
          taskScenarioState,
          pageErrors: [...pageErrors],
          taskVisible,
          currentTaskRow
        },
        error:
          pageErrors.length > 0
            ? `Unexpected page errors: ${pageErrors.join(" | ")}`
            : !taskVisible
              ? "Running focus view did not render the current task row"
              : !currentTaskRow.isVisible
                ? "Running focus view did not expose the current task row state"
                : undefined
      };

      if (
        pageErrors.length > 0 ||
        !taskVisible ||
        !currentTaskRow.isVisible
      ) {
        throw new Error(
          steps.taskFocusFeedback.error ??
            "Running focus task row did not render active feedback"
        );
      }
    } catch (error) {
      steps.taskFocusFeedback = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          taskScenarioState,
          pageErrors: [...pageErrors]
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
      goalFocusLabel,
      taskFocusLabel,
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

import { expect, test } from "@playwright/test";
import { ensureInAppOnHome } from "../../../utils/helpers";
import {
  ensureOfflineSessionId,
  resolveRepoFsImportPath
} from "../../../../scripts/runtime";

test.describe("advanced focus items @regression @feature @focus-feature", () => {
  test("render goal focus items in running focus view after session start", async ({
    browser
  }) => {
    test.setTimeout(120_000);

    const baseURL =
      process.env.APP_BASE_URL_NUCLEUM ??
      process.env.APP_BASE_URL_NUCLEUS ??
      process.env.APP_BASE_URL ??
      "http://127.0.0.1:5051";

    const context = await browser.newContext();
    await context.addInitScript(ensureOfflineSessionId);
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const goalLabel = `E2E advanced focus ${Date.now()}`;

    await page.goto(new URL("/focus", baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await ensureInAppOnHome(page);
    await page.goto(new URL("/focus", baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("button", { name: /Start focus/i }).first()).toBeVisible({
      timeout: 15_000
    });

    const seededState = await page.evaluate(async ({ label, modulePaths }) => {
      const sessionMod = await import(modulePaths.sessionStorePath);
      const goalMod = await import(modulePaths.goalStorePath);

      await sessionMod.activeSession.close();

      const goal = await goalMod.goalStore.save({
        label,
        isPreventOpenAfterCreate: true
      });
      if (!goal) {
        throw new Error("Failed to seed focus goal");
      }

      await sessionMod.focusItemsStore.addGoal(goal.id);
      await sessionMod.activeSession.startSession();

      return {
        goalId: goal.id.toString(),
        goalLabel: goal.label,
        focusItems: sessionMod.focusItemsStore.get().items.map((item) => ({
          id: item.id.toString()
        })),
        activeSession: sessionMod.activeSession.get()
      };
    }, {
      label: goalLabel,
      modulePaths: {
        sessionStorePath: resolveRepoFsImportPath(
          "client/products/pointron/focus/session.store.ts"
        ),
        goalStorePath: resolveRepoFsImportPath(
          "client/components/goals/goal.store.ts"
        )
      }
    });

    await expect(page.getByText(goalLabel, { exact: true }).first()).toBeVisible({
      timeout: 15_000
    });
    const currentGoalRow = page
      .locator(".bg-ccs1")
      .filter({ has: page.getByText(goalLabel, { exact: true }) })
      .first();
    await expect(currentGoalRow).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(/No focus items added\./i)).toBeHidden({
      timeout: 15_000
    });
    await expect(page.getByText(/CURRENT FOCUS/i).first()).toBeVisible({
      timeout: 15_000
    });

    expect(
      seededState.focusItems.some((item) => item.id === seededState.goalId)
    ).toBe(true);
    expect(seededState.goalLabel).toBe(goalLabel);
    expect(pageErrors).toEqual([]);

    await context.close();
  });

  test("render task focus items in running focus view after task start", async ({
    browser
  }) => {
    test.setTimeout(120_000);

    const baseURL =
      process.env.APP_BASE_URL_NUCLEUM ??
      process.env.APP_BASE_URL_NUCLEUS ??
      process.env.APP_BASE_URL ??
      "http://127.0.0.1:5051";

    const context = await browser.newContext();
    await context.addInitScript(ensureOfflineSessionId);
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const goalLabel = `E2E task focus goal ${Date.now()}`;
    const taskLabel = `E2E task focus task ${Date.now()}`;

    await page.goto(new URL("/focus", baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await ensureInAppOnHome(page);
    await page.goto(new URL("/focus", baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("button", { name: /Start focus/i }).first()).toBeVisible({
      timeout: 15_000
    });

    const seededState = await page.evaluate(
      async ({ goalLabel, taskLabel, modulePaths }) => {
        const sessionMod = await import(modulePaths.sessionStorePath);
        const goalMod = await import(modulePaths.goalStorePath);

        await sessionMod.activeSession.close();

        const goal = await goalMod.goalStore.save({
          label: goalLabel,
          isPreventOpenAfterCreate: true
        });
        if (!goal) {
          throw new Error("Failed to seed focus goal");
        }

        await sessionMod.focusItemsStore.addGoal(goal.id);
        const createdTasks = await sessionMod.focusItemsStore.addNewTask(
          taskLabel,
          goal.id
        );
        const task = createdTasks?.[0];
        if (!task) {
          throw new Error("Failed to seed focus task");
        }

        await sessionMod.activeSession.startSession();
        await sessionMod.activeSession.startTask(task.id);

        return {
          goalId: goal.id.toString(),
          goalLabel: goal.label,
          taskId: task.id.toString(),
          taskLabel: task.label,
          focusItems: sessionMod.focusItemsStore.get().items.map((item) => ({
            id: item.id.toString(),
            tasks: item.tasks?.map((taskId) => taskId.toString()) ?? []
          })),
          activeSession: sessionMod.activeSession.get()
        };
      },
      {
        goalLabel,
        taskLabel,
        modulePaths: {
          sessionStorePath: resolveRepoFsImportPath(
            "client/products/pointron/focus/session.store.ts"
          ),
          goalStorePath: resolveRepoFsImportPath(
            "client/components/goals/goal.store.ts"
          )
        }
      }
    );

    const currentTaskRow = page
      .locator(".bg-ccs1")
      .filter({ has: page.getByText(taskLabel, { exact: true }) })
      .first();

    await expect(page.getByText(goalLabel, { exact: true }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(taskLabel, { exact: true }).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(currentTaskRow).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(/CURRENT FOCUS/i).first()).toBeVisible({
      timeout: 15_000
    });

    expect(
      seededState.focusItems.some((item) => item.id === seededState.goalId)
    ).toBe(true);
    expect(
      seededState.focusItems.some((item) => item.id === seededState.taskId)
    ).toBe(true);
    expect(seededState.goalLabel).toBe(goalLabel);
    expect(seededState.taskLabel).toBe(taskLabel);
    expect(pageErrors).toEqual([]);

    await context.close();
  });
});

import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal - browse flows @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });
  });

  test.describe("from library", () => {
    test("open Library → Goals and see goal in list", async ({ page }) => {
      test.setTimeout(60_000);
      await ensureInAppOnHome(page);
      const goalName = `E2E browse goal ${Date.now()}`;
      await runCommand(page, "Create a new goal");
      const goalNameInput = page.getByTestId("goal-name-input");
      await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await goalNameInput.fill(goalName);
      await page.keyboard.press("Enter");
      await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
      await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), { timeout: 10_000 });
      await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().click({ timeout: 5_000 });
      await page.waitForTimeout(1_500);
      await expect(page.getByText(goalName, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("from pinned resource browser (Quick Focus)", () => {
    test("pin goal via command (Pin a goal to quick focus → search → select), then assert in pinned list", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E pin goal ${Date.now()}`;

      await runCommand(page, "Create a new goal");
      const goalNameInput = page.getByTestId("goal-name-input");
      await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await goalNameInput.fill(goalName);
      await page.keyboard.press("Enter");
      await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");

      await runCommand(page, "Pin a goal to quick focus");
      const pinSearchInput = page.getByTestId("command-bar-input");
      await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
      await pinSearchInput.fill(goalName);
      await page.waitForTimeout(800);
      await page.keyboard.press("Enter");

      await page
        .getByTestId("command-bar-input")
        .waitFor({ state: "hidden", timeout: 5_000 })
        .catch(() => null);
      await page.waitForTimeout(500);

      await page.getByRole("button", { name: /^Focus$/i }).click({
        timeout: 5_000
      });
      await page
        .getByTestId("quick-focus-search")
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Pinned list item in Quick Focus panel shows goal name and "Not focused today"
      const pinnedGoal = page
        .locator("button")
        .filter({ hasText: goalName })
        .filter({ hasText: "Not focused today" })
        .first();
      await expect(pinnedGoal).toBeVisible({ timeout: 15_000 });
    });

    test("pin goal via UI (Focus → Quick Focus → Edit → Pin another goal → search → select), then assert in pinned list", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E pin UI ${Date.now()}`;

      await page
        .getByRole("button", { name: /^Library$/i })
        .click({ timeout: 5_000 });
      await page.waitForURL(
        (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
        { timeout: 10_000 }
      );
      await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().click({
        timeout: 5_000
      });
      await page.waitForTimeout(500);

      const newGoalBtn = page.getByRole("button", { name: /New goal/i }).first();
      const createNewGoalBtn = page
        .getByRole("button", { name: /Create new goal/i })
        .first();
      const clicked = await newGoalBtn
        .click({ timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        await createNewGoalBtn.click({ timeout: 5_000 });
      }

      const goalNameInput = page.getByTestId("goal-name-input");
      await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
      await goalNameInput.fill(goalName);
      await page.keyboard.press("Enter");
      await page
        .getByRole("button", { name: /^Close$/i })
        .first()
        .click({ timeout: 5_000 })
        .catch(() => null);
      await page.waitForTimeout(500);

      await page.getByRole("button", { name: /^Focus$/i }).click({
        timeout: 5_000
      });
      const quickFocusSearch = page.getByTestId("quick-focus-search");
      await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(500);

      await quickFocusSearch.fill(goalName);
      await page.waitForTimeout(1_200);

      await page.getByRole("button", { name: "Edit" }).click({ timeout: 5_000 });
      await page
        .getByRole("button", { name: "Pin another goal" })
        .click({ timeout: 5_000 });

      const pinSearchInput = page.getByTestId("command-bar-input");
      await pinSearchInput.waitFor({ state: "visible", timeout: 10_000 });
      await pinSearchInput.fill(goalName);
      await page.waitForTimeout(800);
      await page.keyboard.press("Enter");

      await page
        .getByTestId("command-bar-input")
        .waitFor({ state: "hidden", timeout: 5_000 })
        .catch(() => null);
      await page.waitForTimeout(800);

      await quickFocusSearch.clear();
      await page.waitForTimeout(1_000);

      const pinnedGoal = page
        .locator("button")
        .filter({ hasText: goalName })
        .filter({ hasText: "Not focused today" })
        .first();
      await expect(pinnedGoal).toBeVisible({ timeout: 15_000 });
    });
  });
});

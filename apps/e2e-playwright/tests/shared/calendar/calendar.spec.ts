import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";
import type { Page } from "@playwright/test";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function fillManualLogEntryAndSave(page: Page, goalName: string) {
  const goalInput = page.getByPlaceholder("Start typing to select goal");
  await goalInput.waitFor({ state: "visible", timeout: 10_000 });
  await goalInput.fill(goalName);
  await page.waitForTimeout(1_000);
  await page.keyboard.press("Enter");

  const quickDurationBtn = page
    .getByRole("button", { name: /last\s+10\s*min/i })
    .first();
  const hasQuick = await quickDurationBtn.isVisible().catch(() => false);
  if (hasQuick) await quickDurationBtn.click({ timeout: 2_000 }).catch(() => null);
  await page.waitForTimeout(300);

  await page
    .locator("button")
    .filter({ hasText: /Save entries/i })
    .click({ timeout: 5_000 });
}

test.describe("calendar – all workflows (Logs, manual time, timeline) @regression", () => {
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

  test("manual time entry via command bar (Manual time entry → goal + duration → save), then assert in Logs", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual entry ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runCommand(page, "Manual time entry");
    await expect(
      page.getByText("Manual time entry").first()
    ).toBeVisible({ timeout: 10_000 });
    await fillManualLogEntryAndSave(page, goalName);

    await page.waitForTimeout(1_500);
    await runCommand(page, "See Logs");
    await expect(page.getByText("Logs").first()).toBeVisible({
      timeout: 10_000
    });
    await expect(
      page.getByText(goalName, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("manual time entry via UI (Focus → Add manual log → goal + duration → save), then assert in Logs", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual UI ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await runCommand(page, "Focus");
    await page
      .getByRole("button", { name: /Add manual log/i })
      .click({ timeout: 10_000 });
    await expect(
      page.getByText("Manual time entry").first()
    ).toBeVisible({ timeout: 10_000 });
    await fillManualLogEntryAndSave(page, goalName);

    await page.waitForTimeout(1_500);
    await runCommand(page, "See Logs");
    await expect(page.getByText("Logs").first()).toBeVisible({
      timeout: 10_000
    });
    await expect(
      page.getByText(goalName, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand, getProductConfig } from "../../utils/helpers";
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

test.describe("calendar - all workflows (Logs, manual time, timeline) @regression @smoke @calendar-smoke", () => {
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
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.commands.manualTimeEntry,
      "Manual time entry command is not part of this product contract"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual entry ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
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
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.calendar.manualLogUiEntry,
      "Focus manual-log entry UI is not part of this product contract"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const goalName = `E2E manual UI ${Date.now()}`;

    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 });
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

  test("calendar: navigate dates (prev/next) and verify day content updates (or N/A if no date nav)", async ({
    page
  }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.calendar.dateNavigation,
      "Calendar date navigation is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const todayBtn = page.getByRole("button", { name: /^Today$/i }).first();
    await expect(todayBtn).toBeVisible({ timeout: 10_000 });

    const prevBtn = page
      .getByRole("button", { name: /Previous day|Previous|Back/i })
      .first();
    const nextBtn = page.getByRole("button", { name: /Next day|Next/i }).first();

    await expect(prevBtn).toBeVisible({ timeout: 10_000 });
    await expect(nextBtn).toBeVisible({ timeout: 10_000 });

    const getDayMarker = async () => {
      // Avoid matching the persistent "Today" nav button; use weekday/month-day labels that change with navigation.
      const candidates = [
        page.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i).first(),
        page.getByText(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i).first()
      ];
      for (const c of candidates) {
        const visible = await c.isVisible().catch(() => false);
        if (visible) return (await c.textContent())?.trim() ?? "";
      }
      return new URL(page.url()).pathname + new URL(page.url()).search;
    };

    const before = await getDayMarker();
    await prevBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);
    const afterPrev = await getDayMarker();
    expect(afterPrev).not.toEqual(before);

    await nextBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);
    const afterNext = await getDayMarker();
    // After going prev then next, we should be back at the original day (most UIs).
    expect(afterNext).toEqual(before);
  });
});

import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand, getProductConfig } from "../../utils/helpers";
import { nucleusProductConfig } from "../../../config/nucleus-product.config";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

/**
 * Overview page (Focus analytics): verify multiple elements per section.
 * Opening Overview via command bar or UI is already tested in app-nav.spec.ts.
 */
test.describe("overview - Focus widgets and tabs (verify multiple elements) @regression", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
    test.skip(
      testInfo.project.name === "memotron",
      "Memotron Overview is not the Focus analytics dashboard (no All/Days/Months/Years tabs or Focus↔Memory switch)"
    );
  });

  test("Overview Focus: time tabs (All, Days, Months, Years) and at least two period sections visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await expect(page.getByText("Overview").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /^Focus$/i }).first()).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("button", { name: /^All$/i }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByRole("button", { name: /^Days$/i }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByRole("button", { name: /^Months$/i }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByRole("button", { name: /^Years$/i }).first()).toBeVisible({
      timeout: 5_000
    });

    const todayHeading = page.getByText("Today", { exact: true }).first();
    await expect(todayHeading).toBeVisible({ timeout: 5_000 });

    const secondPeriod = page
      .getByText(/^(Last 7 days|Last 14 days|Yesterday|Last 30 days|This month|Last month|This year|Last year)$/i)
      .first();
    await expect(secondPeriod).toBeVisible({ timeout: 5_000 });
  });

  test("Overview Focus: empty state or metric cards (Total, Focus, Break) visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    const hasEmptyState = await page
      .getByText("No data available")
      .first()
      .isVisible()
      .catch(() => false);
    const hasSubtext = await page
      .getByText(/Please come back after you focus for this time period/)
      .first()
      .isVisible()
      .catch(() => false);
    const hasTotal = await page.getByText("Total", { exact: true }).first().isVisible().catch(() => false);
    const focusMetricLocator = page.getByText("Focus", { exact: true }).nth(1);
    const hasFocusMetric = await focusMetricLocator.isVisible().catch(() => false);
    const hasBreak = await page.getByText("Break", { exact: true }).first().isVisible().catch(() => false);

    expect(
      hasEmptyState || hasSubtext || (hasTotal && hasFocusMetric && hasBreak),
      "Expected either empty state (No data available / subtext) or metric cards (Total, Focus, Break)"
    ).toBe(true);
  });

  test("Overview Focus: Days tab shows Today, Yesterday, Last 30 days and metric cards", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await page.getByRole("button", { name: /^Days$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Yesterday", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Last 30 days", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await expect(page.getByText("Total", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    const focusMetricCard = page.getByText("Focus", { exact: true }).nth(1);
    await expect(focusMetricCard).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Break", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Overview Focus: Months tab shows This month, Last month, Last 3 months", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await page.getByRole("button", { name: /^Months$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    await expect(page.getByText(/^This month$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText(/^Last month$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText(/^Last 3 months$/i).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Overview Focus: Years tab shows This year and Last year", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await page.getByRole("button", { name: /^Years$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    await expect(page.getByText(/^This year$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText(/^Last year$/i).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Overview Focus: All tab shows period sections and table or chart area", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await page.waitForURL(
      (u) =>
        new RegExp(`^${nucleusProductConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await page.getByRole("button", { name: /^All$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    const hasTableHeader = await page
      .getByText("Total focus")
      .first()
      .isVisible()
      .catch(() => false);
    const hasGoalHeader = await page.getByText("Goal", { exact: true }).first().isVisible().catch(() => false);
    const hasNoData = await page.getByText("No data available").first().isVisible().catch(() => false);
    const hasNoDataPresent = await page
      .getByText("No data present.")
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      hasTableHeader || hasGoalHeader || hasNoData || hasNoDataPresent,
      "Expected table headers (Goal / Total focus) or empty state"
    ).toBe(true);
  });

  test("Overview: Focus and Memory panel switcher visible when on Overview", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "pointron",
      "Pointron Overview does not expose Focus/Memory panel switcher"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    const productConfig = getProductConfig(testInfo.project.name);
    await page.waitForURL(
      (u) =>
        new RegExp(`^${productConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    await expect(page.getByText("Focus").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Memory").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Overview: switch Focus → Memory and verify content changes (or N/A if Memory view not available)", async ({
    page
  }, testInfo) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    const productConfig = getProductConfig(testInfo.project.name);
    await page.waitForURL(
      (u) =>
        new RegExp(`^${productConfig.pathByNavLabel.Overview}(\\/.*)?$`).test(
          new URL(u).pathname
        ),
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_200);

    const focusBtn = page.getByRole("button", { name: /^Focus$/i }).first();
    const memoryBtn = page.getByRole("button", { name: /^Memory$/i }).first();
    await expect(focusBtn).toBeVisible({ timeout: 10_000 });

    const hasMemorySwitch = await memoryBtn.isVisible().catch(() => false);
    if (!hasMemorySwitch) test.skip(true, "Memory view switch not available on Overview (N/A)");

    const focusSignature = page
      .getByText(/Total focus|\bGoal\b/i)
      .first();
    const focusSigText = (await focusSignature.textContent().catch(() => "")) ?? "";

    await memoryBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);

    const memorySignature = page
      .getByText(/Memory|Node|Nodes|Capture/i)
      .first();
    await expect(memorySignature).toBeVisible({ timeout: 10_000 });

    const memorySigText = (await memorySignature.textContent().catch(() => "")) ?? "";
    const memoryTabActive =
      (await memoryBtn.getAttribute("aria-pressed")) === "true" ||
      (await memoryBtn.getAttribute("data-state")) === "active";
    expect(
      memorySigText !== focusSigText || memoryTabActive,
      "Expected Memory view content to differ from Focus or Memory tab to be active"
    ).toBe(true);
  });
});

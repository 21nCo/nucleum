import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  ensureInAppOnHome,
  getProductConfig,
  navigateToSurface,
  expectCurrentSurfaceVisible
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

test.describe("overview - Focus widgets and tabs (verify multiple elements) @regression @smoke @overview-smoke", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.overview
        .focusAnalyticsDashboard,
      "Overview focus analytics dashboard is not part of this product contract"
    );
  });

  test("Overview Focus: time tabs (All, Days, Months, Years) and at least two period sections visible", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await expect(page.getByText("Overview").first()).toBeVisible({
      timeout: 10_000
    });
    await expect(getOverviewTab(page, "All")).toBeVisible({ timeout: 5_000 });
    await expect(getOverviewTab(page, "Days")).toBeVisible({ timeout: 5_000 });
    await expect(getOverviewTab(page, "Months")).toBeVisible({
      timeout: 5_000
    });
    await expect(getOverviewTab(page, "Years")).toBeVisible({ timeout: 5_000 });

    const todayHeading = page.getByText("Today", { exact: true }).first();
    await expect(todayHeading).toBeVisible({ timeout: 5_000 });

    const secondPeriod = page
      .getByText(
        /^(Last 7 days|Last 14 days|Yesterday|Last 30 days|This month|Last month|This year|Last year)$/i
      )
      .first();
    await expect(secondPeriod).toBeVisible({ timeout: 5_000 });
  });

  test("Overview Focus: empty state or metric cards (Total, Focus, Break) visible", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

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
    const hasTotal = await page
      .getByText("Total", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    const focusMetricLocator = page.getByText("Focus", { exact: true }).nth(1);
    const hasFocusMetric = await focusMetricLocator
      .isVisible()
      .catch(() => false);
    const hasBreak = await page
      .getByText("Break", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      hasEmptyState || hasSubtext || (hasTotal && hasFocusMetric && hasBreak),
      "Expected either empty state (No data available / subtext) or metric cards (Total, Focus, Break)"
    ).toBe(true);
  });

  test("Overview Focus: Days tab shows Today, Yesterday, Last 30 days and metric cards", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await clickOverviewTab(page, "Days");

    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Yesterday", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Last 30 days", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });

    await expectOverviewMetricsOrEmptyState(page);
  });

  test("Overview Focus: Months tab shows This month, Last month, Last 3 months", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await clickOverviewTab(page, "Months");

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
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await clickOverviewTab(page, "Years");

    await expect(page.getByText(/^This year$/i).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText(/^Last year$/i).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Overview Focus: All tab shows period sections and table or chart area", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await clickOverviewTab(page, "All");

    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    const hasTableHeader = await page
      .getByText("Total focus")
      .first()
      .isVisible()
      .catch(() => false);
    const hasGoalHeader = await page
      .getByText("Goal", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    const hasNoData = await page
      .getByText("No data available")
      .first()
      .isVisible()
      .catch(() => false);
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
      !getProductConfig(testInfo.project.name).capabilities.overview
        .memoryPanelSwitch,
      "Overview memory switch is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await expectCurrentSurfaceVisible(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
  });

  test("Overview panel switching stays responsive without page errors on repeated navigation", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.overview
        .memoryPanelSwitch,
      "Overview memory switch is not part of this product contract"
    );
    test.setTimeout(60_000);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await navigateToSurface(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
    await navigateToSurface(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    expect(pageErrors).toEqual([]);
  });

  test("Overview: switch Focus → Memory and verify content changes (or N/A if Memory view not available)", async ({
    page
  }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.overview
        .memoryPanelSwitch,
      "Overview memory switch is not part of this product contract"
    );
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );

    await expectCurrentSurfaceVisible(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await navigateToSurface(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.memory",
      testInfo.project.name as any
    );
    const memorySignature = page
      .getByText(/Memory|Node|Nodes|Capture/i)
      .first();
    await expect(memorySignature).toBeVisible({ timeout: 10_000 });
    await navigateToSurface(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
    await expectCurrentSurfaceVisible(
      page,
      "overview.focus",
      testInfo.project.name as any
    );
  });
});

function getOverviewTab(page: Page, label: string): Locator {
  return page.getByRole("tab", { name: new RegExp(`^${label}$`, "i") }).first();
}

async function expectOverviewMetricsOrEmptyState(page: Page) {
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
  const hasTotal = await page
    .getByText("Total", { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  const hasFocusMetric = await page
    .getByText("Focus", { exact: true })
    .nth(1)
    .isVisible()
    .catch(() => false);
  const hasBreak = await page
    .getByText("Break", { exact: true })
    .first()
    .isVisible()
    .catch(() => false);

  expect(
    hasEmptyState || hasSubtext || (hasTotal && hasFocusMetric && hasBreak),
    "Expected either empty state (No data available / subtext) or metric cards (Total, Focus, Break)"
  ).toBe(true);
}

async function clickOverviewTab(page: Page, label: string) {
  const tab = getOverviewTab(page, label);
  await expect(tab).toBeVisible({ timeout: 10_000 });
  await tab.click({ timeout: 5_000 });
  await expect(tab).toHaveAttribute("aria-selected", "true", {
    timeout: 10_000
  });
}

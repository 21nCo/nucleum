import { expect, test, type Locator, type Page } from "@playwright/test";
import type { ProductName } from "../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  getConfigCapabilitySkipReason,
  navigateToSurface
} from "../../utils/helpers";

const overviewTabContracts = [
  {
    capabilityKey: "all" as const,
    label: "All",
    anchors: [/^Today$/i, /Total focus/i, /No data available/i, /No data present\./i]
  },
  {
    capabilityKey: "days" as const,
    label: "Days",
    anchors: [/^Today$/i, /^Yesterday$/i, /^Last 30 days$/i]
  },
  {
    capabilityKey: "months" as const,
    label: "Months",
    anchors: [/^This month$/i, /^Last month$/i, /^Last 3 months$/i]
  },
  {
    capabilityKey: "years" as const,
    label: "Years",
    anchors: [/^This year$/i, /^Last year$/i]
  }
] as const;

function getProductName(projectName: string) {
  return projectName as ProductName;
}

function getOverviewTab(page: Page, label: string): Locator {
  return page.getByRole("tab", { name: new RegExp(`^${label}$`, "i") }).first();
}

function capturePageErrors(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  return pageErrors;
}

async function expectAnyTextVisible(page: Page, anchors: readonly RegExp[]) {
  await expect
    .poll(
      async () => {
        for (const anchor of anchors) {
          if (await page.getByText(anchor).first().isVisible().catch(() => false)) {
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000 }
    )
    .toBe(true);
}

test.describe("overview focus analytics depth @regression @feature @overview-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("declared overview analytics tabs switch with active semantics and content anchors", async ({
    page
  }, testInfo) => {
    const pageErrors = capturePageErrors(page);
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.overview.focusAnalyticsDashboard,
      getConfigCapabilitySkipReason("overview.focusAnalyticsDashboard")
    );

    await navigateToSurface(page, "overview.focus", projectName);

    for (const tabContract of overviewTabContracts) {
      if (!config.capabilities.overview.tabs[tabContract.capabilityKey]) continue;
      const tab = getOverviewTab(page, tabContract.label);
      await expect(tab).toBeVisible({ timeout: 10_000 });
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 10_000
      });
      await expectAnyTextVisible(page, tabContract.anchors);
    }

    expect(pageErrors).toEqual([]);
  });

  test("overview focus analytics exposes either metric cards or empty state on the active tab", async ({
    page
  }, testInfo) => {
    const pageErrors = capturePageErrors(page);
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.overview.focusAnalyticsDashboard,
      getConfigCapabilitySkipReason("overview.focusAnalyticsDashboard")
    );

    await navigateToSurface(page, "overview.focus", projectName);

    await expect
      .poll(
        async () => {
          const total = await page.getByText(/^Total$/i).first().isVisible().catch(() => false);
          const focus = await page.getByText(/^Focus$/i).nth(1).isVisible().catch(() => false);
          const breakMetric = await page.getByText(/^Break$/i).first().isVisible().catch(() => false);
          const emptyState = await page.getByText(/No data available/i).first().isVisible().catch(() => false);
          const noDataPresent = await page.getByText(/No data present\./i).first().isVisible().catch(() => false);
          return emptyState || noDataPresent || (total && focus && breakMetric);
        },
        { timeout: 15_000 }
      )
      .toBe(true);

    expect(pageErrors).toEqual([]);
  });

  test("direct overview focus route survives reload without page errors", async ({
    page
  }, testInfo) => {
    const pageErrors = capturePageErrors(page);
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.overview.focusAnalyticsDashboard,
      getConfigCapabilitySkipReason("overview.focusAnalyticsDashboard")
    );

    await page.goto("/overview?rview-tab=focus", {
      waitUntil: "domcontentloaded"
    });
    await ensureInAppOnHome(page);
    await page.goto("/overview?rview-tab=focus", {
      waitUntil: "domcontentloaded"
    });

    await expect(getOverviewTab(page, "All")).toBeVisible({ timeout: 15_000 });
    await expectAnyTextVisible(page, [
      /^Today$/i,
      /Total focus/i,
      /No data available/i,
      /No data present\./i
    ]);
    expect(pageErrors).toEqual([]);
  });

  test("overview focus analytics edit toggle and live view title edit do not regress", async ({
    page
  }, testInfo) => {
    const pageErrors = capturePageErrors(page);
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.overview.focusAnalyticsDashboard,
      getConfigCapabilitySkipReason("overview.focusAnalyticsDashboard")
    );

    await navigateToSurface(page, "overview.focus", projectName);

    const editToggle = page
      .locator('div:has-text("edit:") input[type="checkbox"]')
      .first();
    await expect(editToggle).toBeVisible({ timeout: 10_000 });
    await editToggle.click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    expect(pageErrors).toEqual([]);

    const originalTab = getOverviewTab(page, "All");
    await expect(originalTab).toBeVisible({ timeout: 10_000 });
    const editableTabButton = originalTab.getByRole("button", { name: /^All$/i }).first();
    await expect(editableTabButton).toBeVisible({ timeout: 10_000 });
    await editableTabButton.dblclick({ timeout: 5_000 });

    const renamedLabel = `All ${Date.now()}`;
    const labelInput = page.locator('input[placeholder="Label"]:visible').last();
    await expect(labelInput).toBeVisible({ timeout: 10_000 });
    await labelInput.fill(renamedLabel);
    await page.waitForTimeout(500);

    const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
    await expect(activeTab).toBeVisible({ timeout: 10_000 });
    await expect(activeTab).toContainText(renamedLabel, { timeout: 10_000 });
    expect(pageErrors).toEqual([]);
  });

});

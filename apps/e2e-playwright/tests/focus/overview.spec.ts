import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureInAppOnHome, navigateToSurface } from "../utils/helpers";
import {
  expectAnyLocatorVisible,
  getAnyVisibleLocator
} from "../utils/locator-assertions";
import { collectPageErrors } from "./focus-test-helpers";

const overviewTabContracts = [
  {
    label: "All",
    anchors: [
      /^Today$/i,
      /Total focus/i,
      /No data available/i,
      /No data present\./i
    ]
  },
  {
    label: "Days",
    anchors: [/^Today$/i, /^Yesterday$/i, /^Last 30 days$/i]
  },
  {
    label: "Months",
    anchors: [/^This month$/i, /^Last month$/i, /^Last 3 months$/i]
  },
  {
    label: "Years",
    anchors: [/^This year$/i, /^Last year$/i]
  }
] as const;

function getOverviewTab(page: Page, label: string): Locator {
  return page.getByRole("tab", { name: new RegExp(`^${label}$`, "i") }).first();
}

async function expectAnyTextVisible(page: Page, anchors: readonly RegExp[]) {
  await expectAnyLocatorVisible(
    anchors.map((anchor) => page.getByText(anchor).first()),
    {
      message: "active overview tab exposes a visible content anchor",
      timeout: 15_000
    }
  );
}

test.beforeEach(async ({ page }) => {
  await ensureInAppOnHome(page);
});

test("declared overview analytics tabs switch with active semantics and content anchors", async ({
  page
}, testInfo) => {
  const pageErrors = collectPageErrors(page);

  await navigateToSurface(page, "overview.focus", testInfo.project.name);

  for (const tabContract of overviewTabContracts) {
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
  const pageErrors = collectPageErrors(page);

  await navigateToSurface(page, "overview.focus", testInfo.project.name);

  const total = page.getByText(/^Total$/i).first();
  const focus = page.getByText(/^Focus$/i).nth(1);
  const breakMetric = page.getByText(/^Break$/i).first();
  const emptyStates = [
    page.getByText(/No data available/i).first(),
    page.getByText(/No data present\./i).first()
  ];
  const visibleEmptyState = getAnyVisibleLocator(emptyStates);
  await expect(async () => {
    if (await visibleEmptyState.isVisible().catch(() => false)) {
      await expect(visibleEmptyState).toBeVisible({ timeout: 500 });
      return;
    }
    await expect(total).toBeVisible({ timeout: 500 });
    await expect(focus).toBeVisible({ timeout: 500 });
    await expect(breakMetric).toBeVisible({ timeout: 500 });
  }, "overview focus analytics exposes metric cards or an empty state").toPass({
    timeout: 15_000
  });

  expect(pageErrors).toEqual([]);
});

test("direct overview focus route survives reload without page errors", async ({
  page
}) => {
  const pageErrors = collectPageErrors(page);

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
  const pageErrors = collectPageErrors(page);

  await navigateToSurface(page, "overview.focus", testInfo.project.name);

  const editToggle = page
    .locator('div:has-text("edit:") input[type="checkbox"]')
    .first();
  await expect(editToggle).toBeVisible({ timeout: 10_000 });
  await editToggle.click({ timeout: 5_000 });

  expect(pageErrors).toEqual([]);

  const originalTab = getOverviewTab(page, "All");
  await expect(originalTab).toBeVisible({ timeout: 10_000 });
  const editableTabButton = originalTab
    .getByRole("button", { name: /^All$/i })
    .first();
  await expect(editableTabButton).toBeVisible({ timeout: 10_000 });
  await editableTabButton.dblclick({ timeout: 5_000 });

  const renamedLabel = `All ${Date.now()}`;
  const labelInput = page.locator('input[placeholder="Label"]:visible').last();
  await expect(labelInput).toBeVisible({ timeout: 10_000 });
  await labelInput.fill(renamedLabel);

  const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
  await expect(activeTab).toBeVisible({ timeout: 10_000 });
  await expect(activeTab).toContainText(renamedLabel, { timeout: 10_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await navigateToSurface(page, "overview.focus", testInfo.project.name);
  await expect(
    page.getByRole("tab", { name: renamedLabel, exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
  expect(pageErrors).toEqual([]);
});

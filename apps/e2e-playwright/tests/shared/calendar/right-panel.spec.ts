import { expect, test } from "@playwright/test";
import type { ProductName } from "../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  getConfigCapabilitySkipReason,
  navigateToSurface
} from "../../utils/helpers";

const panelContracts = [
  {
    capabilityKey: "timeline" as const,
    label: "timeline",
    surface: "calendar.panel.timeline" as const
  },
  {
    capabilityKey: "overview" as const,
    label: "overview",
    surface: "calendar.panel.overview" as const
  },
  {
    capabilityKey: "notes" as const,
    label: "notes",
    surface: "calendar.panel.notes" as const
  },
  {
    capabilityKey: "activity" as const,
    label: "activity",
    surface: "calendar.panel.activity" as const
  }
] as const;

function getProductName(projectName: string) {
  return projectName as ProductName;
}

test.describe("calendar right panel @regression @feature @calendar-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("calendar declared right-panel panels expose content anchors", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.calendar.rightPanel.enabled,
      getConfigCapabilitySkipReason("calendar.rightPanel.enabled")
    );

    await navigateToSurface(page, "calendar.view.month", projectName);

    const executedPanels: string[] = [];

    for (const panel of panelContracts) {
      if (!config.capabilities.calendar.rightPanel.panels[panel.capabilityKey]) continue;
      await navigateToSurface(page, panel.surface, projectName);
      executedPanels.push(panel.label);
    }

    expect(executedPanels).toEqual(
      panelContracts
        .filter((panel) => config.capabilities.calendar.rightPanel.panels[panel.capabilityKey])
        .map((panel) => panel.label)
    );
  });

  test("calendar month selection updates notes-linked right-panel content where declared", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.calendar.rightPanel.interactions.monthSelectionLinksToNotes,
      "Calendar month-selection to notes linkage is not part of this product contract"
    );

    await navigateToSurface(page, "calendar.view.year", projectName);
    await page.getByRole("button", { name: /^Jan$/i }).first().click({ timeout: 10_000 });

    await expect(page.getByText(/\bMonth Notes\b/i).first()).toBeVisible({
      timeout: 15_000
    });
  });

  test("calendar notes panel stays responsive when switching to activity and activity does not duplicate on reselection", async ({
    page
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.calendar.rightPanel.enabled ||
        !config.capabilities.calendar.rightPanel.panels.notes ||
        !config.capabilities.calendar.rightPanel.panels.activity,
      "Calendar notes/activity panels are not part of this product contract"
    );

    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    const columnsButton = page.getByRole("button", { name: /^Columns$/i }).first();
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    const monthView = page.getByRole("button", { name: /^(?:M|Month|Months)$/i }).first();
    if (await monthView.isVisible().catch(() => false)) {
      await monthView.click({ timeout: 5_000 }).catch(() => null);
      await page.waitForTimeout(500);
    }

    const notesButton = page
      .getByRole("button", { name: /^Notes$/i })
      .or(page.getByRole("tab", { name: /^Notes$/i }))
      .first();
    await notesButton.click({ timeout: 5_000 });

    const editor = page
      .getByPlaceholder(/Start typing or use \/ to browse/i)
      .or(page.getByRole("textbox", { name: /Markdown editor/i }))
      .first();
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click({ timeout: 5_000 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
    await page.keyboard.type(`Calendar regression ${Date.now()}`, { delay: 20 });
    await page.waitForTimeout(1_500);

    const activityButton = page
      .getByRole("button", { name: /^Activity$/i })
      .or(page.getByRole("tab", { name: /^Activity$/i }))
      .first();
    await activityButton.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    expect(
      pageErrors.filter((message) =>
        message.includes("effect_update_depth_exceeded")
      )
    ).toEqual([]);

    const activityRows = page
      .locator("button")
      .filter({
        has: page.locator("span.text-b3.text-fgs3.whitespace-nowrap")
      });
    const beforeCount = await activityRows.count();
    await activityButton.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    await activityButton.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    const afterCount = await activityRows.count();
    const rowTexts = await activityRows.evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
    );

    expect(afterCount).toBe(beforeCount);
    expect(rowTexts.length).toBe(new Set(rowTexts).size);
    expect(pageErrors).toEqual([]);
  });

});

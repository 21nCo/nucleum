import { expect, test } from "@playwright/test";
import type { ProductName } from "../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  getConfigCapabilitySkipReason,
  navigateToSurface
} from "../../utils/helpers";

const layoutContracts = [
  {
    capabilityKey: "classic" as const,
    label: "classic",
    surface: "calendar.layout.classic" as const
  },
  {
    capabilityKey: "bird" as const,
    label: "bird",
    surface: "calendar.layout.bird" as const
  }
] as const;

const viewContracts = [
  {
    capabilityPath: "calendar.views.day",
    label: "day",
    surface: "calendar.view.day" as const
  },
  {
    capabilityPath: "calendar.views.month",
    label: "month",
    surface: "calendar.view.month" as const
  },
  {
    capabilityPath: "calendar.views.year",
    label: "year",
    surface: "calendar.view.year" as const
  }
] as const;

function getProductName(projectName: string) {
  return projectName as ProductName;
}

function resolveDeclaredLayoutSurface(projectName: ProductName) {
  const layouts =
    getE2EProductConfigFromProjectName(projectName).capabilities.calendar.layouts;
  if (layouts.classic) return "calendar.layout.classic" as const;
  return "calendar.layout.bird" as const;
}

test.describe("calendar view matrix @regression @feature @calendar-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("calendar declared layouts expose semantic anchors", async ({ page }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);
    const executedLayouts: string[] = [];

    for (const layout of layoutContracts) {
      if (!config.capabilities.calendar.layouts[layout.capabilityKey]) continue;
      await navigateToSurface(page, layout.surface, projectName);
      executedLayouts.push(layout.label);
    }

    expect(executedLayouts).toEqual(
      layoutContracts
        .filter((layout) => config.capabilities.calendar.layouts[layout.capabilityKey])
        .map((layout) => layout.label)
    );
  });

  test("calendar declared views switch with semantic anchors", async ({ page }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);
    const executedViews: string[] = [];

    await navigateToSurface(page, resolveDeclaredLayoutSurface(projectName), projectName);

    for (const view of viewContracts) {
      if (!config.capabilities.calendar.views[view.label]) continue;
      await navigateToSurface(page, view.surface, projectName);
      executedViews.push(view.label);
    }

    expect(executedViews).toEqual(
      viewContracts
        .filter((view) => config.capabilities.calendar.views[view.label])
        .map((view) => view.label)
    );
  });

  for (const view of viewContracts) {
    test(`calendar ${view.label} view is gated only by config`, async ({ page }, testInfo) => {
      const projectName = getProductName(testInfo.project.name);
      const config = getE2EProductConfigFromProjectName(projectName);

      test.skip(
        !config.capabilities.calendar.views[view.label],
        getConfigCapabilitySkipReason(view.capabilityPath)
      );

      await navigateToSurface(page, resolveDeclaredLayoutSurface(projectName), projectName);
      await navigateToSurface(page, view.surface, projectName);

      await expect(page).toHaveURL(/\/calendar/);
    });
  }
});

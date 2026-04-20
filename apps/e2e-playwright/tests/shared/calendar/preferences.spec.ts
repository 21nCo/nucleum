import { test } from "@playwright/test";
import type { ProductName, SurfaceKey } from "../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  getConfigCapabilitySkipReason,
  expectCurrentSurfaceVisible,
  navigateToSurface
} from "../../utils/helpers";

function getProductName(projectName: string) {
  return projectName as ProductName;
}

function resolvePersistenceSurface(projectName: ProductName): SurfaceKey {
  const views = getE2EProductConfigFromProjectName(projectName).capabilities.calendar.views;
  if (views.month) return "calendar.view.month";
  if (views.day) return "calendar.view.day";
  return "calendar.view.year";
}

test.describe("calendar preferences @regression @feature @calendar-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("calendar active view persists across reload where declared", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.calendar.persistence.activeView,
      getConfigCapabilitySkipReason("calendar.persistence.activeView")
    );

    const targetSurface = resolvePersistenceSurface(projectName);

    await navigateToSurface(page, targetSurface, projectName);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectCurrentSurfaceVisible(page, targetSurface, projectName);
  });
});

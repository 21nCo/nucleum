import { expect, test } from "@playwright/test";
import type { ProductName } from "../../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../../config/product-nav.config";
import {
  ensureInAppOnHome,
  getConfigCapabilitySkipReason,
  navigateToSurface,
  expectCurrentSurfaceVisible
} from "../../utils/helpers";

function getProductName(projectName: string) {
  return projectName as ProductName;
}

test.describe("overview memory panel @regression @feature @overview-feature", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("overview memory panel switches only where declared and exposes content anchors", async ({
    page
  }, testInfo) => {
    const projectName = getProductName(testInfo.project.name);
    const config = getE2EProductConfigFromProjectName(projectName);

    test.skip(
      !config.capabilities.overview.memoryPanelSwitch,
      getConfigCapabilitySkipReason("overview.memoryPanelSwitch")
    );

    await navigateToSurface(page, "overview.focus", projectName);
    await expectCurrentSurfaceVisible(page, "overview.focus", projectName);
    await expectCurrentSurfaceVisible(page, "overview.memory", projectName);

    await navigateToSurface(page, "overview.memory", projectName);
    await expectCurrentSurfaceVisible(page, "overview.memory", projectName);

    await navigateToSurface(page, "overview.focus", projectName);
    await expectCurrentSurfaceVisible(page, "overview.focus", projectName);
  });
});

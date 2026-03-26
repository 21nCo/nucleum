import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node - browse flows (from library, from pinned) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    test("open Library → Nodes and see nodes list", async ({ page }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);
      await openLibraryAndTab(page, LibraryTab.Nodes);
      const recordsContainer = page.locator("#records-container");
      await expect(recordsContainer).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("from pinned resource browser", () => {
    test("pin Nodes in resource browser (leftnav settings), then open Nodes from pinned nav", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      await page.getByTestId("leftnav-settings").click({ timeout: 5_000 });
      const pinDialogVisible = await page
        .getByText("Pin resources")
        .first()
        .isVisible()
        .catch(() => false);
      if (!pinDialogVisible) test.skip(true, "Pinned resource browser not available in this product build");

      const nodesRow = page
        .getByTestId("leftnav-pin-resource")
        .filter({ hasText: /Nodes/i });
      const hasNodesToggle = await nodesRow.first().isVisible().catch(() => false);
      if (!hasNodesToggle) test.skip(true, "Nodes cannot be pinned (N/A)");

      const toggle = nodesRow.locator('input[type="checkbox"]').first();
      const checked = await toggle.isChecked().catch(() => false);
      if (!checked) {
        await nodesRow.locator("label").first().click({ timeout: 2_000 });
        await page.waitForTimeout(300);
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      await page
        .getByRole("button", { name: /^Nodes(\s+\d+)?$/i })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(800);

      await expect(page.locator("#records-container")).toBeVisible({
        timeout: 15_000
      });
    });
  });
});

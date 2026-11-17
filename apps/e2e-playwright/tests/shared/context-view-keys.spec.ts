import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

function selectedTab(page: Page) {
  return page
    .getByTestId("resource-context-tabs")
    .locator('[role="tab"][aria-selected="true"]');
}

test.describe("context view keys", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("Option arrows and number keys switch Overview tabs", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Overview tabs in the top bar are a Nucleum surface"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/overview/dashboard");
    await expect(page.getByTestId("overview-tabs")).toBeVisible({
      timeout: 15_000
    });

    await page.keyboard.press("Alt+ArrowRight");
    await expect(page).toHaveURL(/\/overview\/graph/);
    await page.keyboard.press("Alt+ArrowLeft");
    await expect(page).toHaveURL(/\/overview\/dashboard/);
    await page.keyboard.press("Alt+ArrowLeft");
    await expect(page).toHaveURL(/\/overview\/map/);
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\/overview\/dashboard/);
    await page.keyboard.press("2");
    await expect(page).toHaveURL(/\/overview\/graph/);
  });

  test("Option arrows and number keys switch Library types in the side panel", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Nucleum shows Library types in the side panel"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/library");
    await expect(page).toHaveURL(/\/library\/[^/]+/, { timeout: 15_000 });
    const start = new URL(page.url()).pathname.split("/")[2];

    await page.keyboard.press("Alt+ArrowRight");
    await expect(page).not.toHaveURL(new RegExp(`/library/${start}/`));
    await page.keyboard.press("Alt+ArrowLeft");
    await expect(page).toHaveURL(new RegExp(`/library/${start}/`));
    await page.keyboard.press("2");
    await expect(page).not.toHaveURL(new RegExp(`/library/${start}/`));
    await page.keyboard.press("1");
    await expect(page).toHaveURL(new RegExp(`/library/${start}/`));
  });

  test("Option arrows and number keys switch a node's view tabs", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E view keys ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);

    const tabs = page
      .getByTestId("resource-context-tabs")
      .locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
    const count = await tabs.count();
    test.skip(count < 2, "The node shows fewer than two view tabs");
    await expect(selectedTab(page)).toHaveCount(1);
    const editor = page
      .getByTestId("resource-record-surface")
      .locator("[contenteditable]")
      .first();
    await editor.click();
    await expect(editor).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(editor).not.toBeFocused();
    await expect(page.getByTestId("resource-record-surface")).toBeVisible();
    const start = await tabs.evaluateAll((elements) =>
      elements.findIndex(
        (element) => element.getAttribute("aria-selected") === "true"
      )
    );
    const expectSelected = (index: number) =>
      expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Alt+ArrowRight");
    await expectSelected((start + 1) % count);
    await page.keyboard.press("Alt+ArrowLeft");
    await expectSelected(start);
    await page.keyboard.press("2");
    await expectSelected(1);
    await page.keyboard.press("1");
    await expectSelected(0);
  });
});

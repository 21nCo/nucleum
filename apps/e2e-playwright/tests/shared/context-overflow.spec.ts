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

test.describe("context zone overflow", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
  });

  test("a node's view tabs that do not fit move into a More menu", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E overflow ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const tabs = page
      .getByTestId("resource-context-tabs")
      .locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
    const total = await tabs.count();
    test.skip(total < 3, "The node shows fewer than three view tabs");
    await expect(page.getByTestId("switcher-more")).toHaveCount(0);

    await page.setViewportSize({ width: 900, height: 900 });
    const more = page.getByTestId("switcher-more");
    await expect(more).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => tabs.count(), { message: "some tabs moved into More" })
      .toBeLessThan(total);

    await more.click();
    const hidden = page.locator(".popover button.contextmenuitem").first();
    await expect(hidden).toBeVisible({ timeout: 10_000 });
    const label = (await hidden.innerText()).trim();
    await hidden.click();
    await expect(selectedTab(page)).toHaveAttribute("aria-label", label);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("switcher-more")).toHaveCount(0);
    await expect(tabs).toHaveCount(total);
    await expect(selectedTab(page)).toHaveAttribute("aria-label", label);
  });

  test("Option arrows reach Overview tabs hidden in the More menu", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Overview tabs in the top bar are a Nucleum surface"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 820, height: 700 });
    await ensureInAppOnHome(page);
    await page.goto("/overview/dashboard");
    const overviewTabs = page.getByTestId("overview-tabs");
    await expect(overviewTabs).toBeVisible({ timeout: 15_000 });
    await expect(overviewTabs.getByTestId("switcher-more")).toBeVisible({
      timeout: 10_000
    });
    await expect(
      overviewTabs.getByRole("button", { name: "Graph", exact: true })
    ).toHaveCount(0);

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Alt+ArrowRight");
    await expect(page).toHaveURL(/\/overview\/graph/);
    await expect(
      overviewTabs.getByRole("button", { name: "Graph", exact: true })
    ).toBeVisible();
  });
});

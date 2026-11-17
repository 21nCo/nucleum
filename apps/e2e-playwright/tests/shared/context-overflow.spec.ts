import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome, navigateToSurface } from "../utils/helpers";
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

  test("calendar controls step down instead of running past the top bar", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "The calendar layout switcher in the top bar is a Nucleum surface"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    // The year label has no shorter form, so shortening the date frees no
    // room and the controls must take the next step down.
    await controls.getByRole("button", { name: "Year", exact: true }).click();

    for (let width = 1600; width >= 1200; width -= 50) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            controls.evaluate((element) => {
              const tab = element.closest(
                '[data-testid="top-bar-context-tab"]'
              );
              const last = element.lastElementChild;
              if (!tab || !last) return Number.POSITIVE_INFINITY;
              return Math.round(
                last.getBoundingClientRect().right -
                  tab.getBoundingClientRect().right
              );
            }),
          { message: `controls stay inside the top bar at ${width}px` }
        )
        .toBeLessThanOrEqual(1);
    }
  });
});

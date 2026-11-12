import type { Page } from "@playwright/test";

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodesLibrary
} from "../memory-test-helpers";

let e2eSeed: E2ESeed;

const highlighted = (page: Page) =>
  page.locator("[id^='thumbnail-'][data-item-highlighted]");

async function openSeededLibrary(page: Page) {
  await ensureInAppOnHome(page);
  await e2eSeed.memory.nodes(3, { prefix: "E2E item keys node" });
  await openNodesLibrary(page);
  await expect(
    page.locator("[id^='thumbnail-'][data-id]").filter({
      hasText: "E2E item keys node"
    })
  ).toHaveCount(3, { timeout: 20_000 });
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
}

async function highlightedId(page: Page) {
  await expect(highlighted(page)).toHaveCount(1);
  return (await highlighted(page).getAttribute("data-id")) ?? "";
}

test.describe("nodes - item keys", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("arrow keys move a highlight and Enter opens the item", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    const first = await highlightedId(page);
    await page.keyboard.press("ArrowRight");
    await expect(highlighted(page)).not.toHaveAttribute("data-id", first);
    await page.keyboard.press("ArrowLeft");
    await expect(highlighted(page)).toHaveAttribute("data-id", first);

    await page.keyboard.press("Enter");
    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 20_000
    });
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(first)));
    await expect(highlighted(page)).toHaveCount(0);
  });

  test("Space and Shift arrows add to the selection, and Escape clears the selection before the highlight", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByText(/Selected: 1 node/i)).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.getByText(/Selected: 3 nodes/i)).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("Escape");
    await expect(page.getByText(/Selected: \d+ nodes?/i)).toBeHidden({
      timeout: 10_000
    });
    await expect(highlighted(page)).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(highlighted(page)).toHaveCount(0);
  });

  test("period opens the highlighted item's menu and the menu works from the keyboard", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(".");
    const select = page.getByRole("button", { name: "Select", exact: true });
    await expect(select).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press("ArrowDown");
    await expect(select).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(select).toBeHidden({ timeout: 10_000 });
    await expect(highlighted(page)).toHaveCount(1);

    await page.keyboard.press(".");
    await expect(select).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Selected: 1 node/i)).toBeVisible({
      timeout: 10_000
    });
  });
});

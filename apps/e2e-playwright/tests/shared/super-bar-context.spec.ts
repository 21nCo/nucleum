import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import type { Page } from "@playwright/test";
import { browserShortcutModifier, ensureInAppOnHome } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";
import {
  getResourceThumbnail,
  openResourceBrowser
} from "../utils/resource-matrix";

let e2eSeed: E2ESeed;

/**
 * Opens a seeded record page to give the super bar a context: a node where
 * the product has the Nodes library, otherwise a collection, which every
 * product has. Returns the record's name, which the pill shows.
 */
async function openSeededRecordPage(page: Page, projectName: string) {
  const label = `E2E super bar ${Date.now()}`;
  if (resolveSurfaceContract(requireE2EProduct(projectName), "library.nodes")) {
    const node = await e2eSeed.memory.node({ label });
    await openNodeRecordFromLibraryById(page, node.id);
    return label;
  }
  const collection = await e2eSeed.collections.collection({ label });
  await openResourceBrowser(page, projectName, "collection");
  const thumb = getResourceThumbnail(page, collection.id);
  await expect(thumb).toBeVisible({ timeout: 20_000 });
  await thumb.click({ timeout: 5_000 });
  await expect
    .poll(
      () =>
        new URL(page.url()).searchParams
          .get("page")
          ?.startsWith("collection:") ?? false,
      { timeout: 10_000 }
    )
    .toBe(true);
  return label;
}

test.describe("super bar context and modes", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("shows the resource as a pill, drops it on Backspace, filters commands with > and closes on Escape", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const label = await openSeededRecordPage(page, test.info().project.name);
    await expect(page.getByTestId("top-bar-page-identity")).toContainText(
      label
    );
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press(`${await browserShortcutModifier(page)}+k`);
    const input = page.getByTestId("command-bar-input");
    await expect(input).toBeFocused();
    await expect(page.getByTestId("super-bar-context-name")).toHaveText(label);
    await page.screenshot({
      path: test.info().outputPath("super-bar-context-pill.png")
    });
    await expect(page.getByTestId("super-bar-group-context")).toBeVisible();

    await input.press("Backspace");
    await expect(page.getByTestId("super-bar-context-pill")).toHaveCount(0);
    await expect(page.getByTestId("super-bar-group-context")).toHaveCount(0);
    await expect(input).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("super-bar-global.png")
    });

    await input.pressSequentially(">set");
    await expect(page.getByTestId("super-bar-mode-chip")).toBeVisible();
    await expect(input).toHaveValue("set");
    await expect(page.getByTestId("super-bar-group-command")).toBeVisible();
    await expect(page.getByTestId("super-bar-group-result")).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath("super-bar-commands-mode.png")
    });

    await input.press("Escape");
    await expect(input).toBeHidden();
  });
});

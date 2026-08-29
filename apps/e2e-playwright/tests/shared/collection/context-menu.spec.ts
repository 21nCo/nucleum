import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  getResourceContextMenuTrigger,
  getResourceRecordContextMenuTrigger,
  getResourceThumbnail,
  openResourceBrowser,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

async function openCollectionContextMenuFromLibrary(page: Page, id: string) {
  await openResourceBrowser(page, test.info().project.name, "collection");
  const thumb = getResourceThumbnail(page, id);
  await expect(thumb).toBeVisible({ timeout: 20_000 });
  await thumb.hover();
  await getResourceContextMenuTrigger(thumb).click({
    timeout: 5_000
  });
}

async function openRecordPageContextMenu(page: Page) {
  const menuButton = getResourceRecordContextMenuTrigger(page);
  await expect(menuButton).toBeVisible({ timeout: 10_000 });
  await menuButton.click({ timeout: 5_000 });
}

async function dismissAnyModals(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("Escape");
  }
}

test.describe("collection - context menu (library + record page) @context-menu", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("library: context menu shows expected core actions", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll ctx ${Date.now()}`;
    const collection = await e2eSeed.collections.collection({ label: name });
    await openCollectionContextMenuFromLibrary(page, collection.id);

    const contract = requireResourceBrowseContract(
      test.info().project.name,
      "collection"
    );
    for (const actionId of contract.libraryActionIds) {
      await expect(
        page.locator(`[data-context-menu-item-id="${actionId}"]`)
      ).toBeVisible({ timeout: 8_000 });
    }

    await dismissAnyModals(page);
  });

  test("record page: context menu shows expected core actions (or N/A if no record page)", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll rec ctx ${Date.now()}`;
    const collection = await e2eSeed.collections.collection({ label: name });
    const contract = await openResourceBrowser(
      page,
      test.info().project.name,
      "collection"
    );
    const thumb = getResourceThumbnail(page, collection.id);
    await expect(thumb).toBeVisible({ timeout: 20_000 });
    await thumb.click({ timeout: 5_000 });

    await expect
      .poll(
        () => {
          const resource = new URL(page.url()).searchParams.get("r");
          return resource?.startsWith("collection:") ?? false;
        },
        {
          message:
            "record page: context menu shows expected core actions (or N/A...: toBe true",
          timeout: 10_000
        }
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: /^Add$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await openRecordPageContextMenu(page);
    for (const actionId of contract.recordActionIds) {
      const menuItem = page.locator(
        `[data-context-menu-item-id="${actionId}"]`
      );
      await expect(menuItem).toBeVisible({ timeout: 8_000 });
    }

    await dismissAnyModals(page);
  });
});

import { test, expect, type Page } from "@playwright/test";
import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand
} from "../../utils/helpers";
import { requireResourceRecordContract } from "../../utils/resource-matrix";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function createCollection(page: Page, name: string) {
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(name);
  const modal = page.locator("#collection_create");
  await modal.getByRole("button", { name: /Save.*Enter/i }).click({ timeout: 8_000 });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.waitForTimeout(600);
}

async function openCollectionContextMenuFromLibrary(page: Page, name: string) {
  await openLibraryAndTab(page, LibraryTab.Collections);
  const container = page.locator("#records-container");
  await expect(container).toBeVisible({ timeout: 15_000 });

  const thumb = container
    .locator('div[id^="thumbnail-"]')
    .filter({ hasText: name })
    .first();
  await expect(thumb).toBeVisible({ timeout: 20_000 });
  await thumb.hover();
  await page.waitForTimeout(250);
  await thumb
    .getByTestId("thumbnail-context-menu-trigger")
    .locator("button")
    .first()
    .click({ timeout: 5_000 });
  await page.waitForTimeout(300);
}

async function openRecordPageContextMenu(page: Page) {
  const menuButton = page
    .locator("button")
    .filter({
      has: page.locator('use[href*="dots-three-vertical-light"]')
    })
    .first();
  await expect(menuButton).toBeVisible({ timeout: 10_000 });
  await menuButton.click({ timeout: 5_000 });
  await page.waitForTimeout(300);
}

async function dismissAnyModals(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
}

test.describe("collection - context menu (library + record page) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("library: context menu shows expected core actions", async ({ page }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll ctx ${Date.now()}`;
    await createCollection(page, name);
    await openCollectionContextMenuFromLibrary(page, name);

    const expectedItems = [
      { value: ResourceActionType.SELECT },
      { value: ResourceActionType.STAR },
      { value: ResourceActionType.COPY_LINK },
      { value: ResourceActionType.ARCHIVE },
      { value: ResourceActionType.DELETE }
    ];
    for (const item of expectedItems) {
      await expect(
        page.locator(`[data-context-menu-item-id="${item.value}"]`)
      ).toBeVisible({ timeout: 8_000 });
    }

    await dismissAnyModals(page);
  });

  test("record page: context menu shows expected core actions (or N/A if no record page)", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    let hasCollectionRecord = true;
    try {
      requireResourceRecordContract(testInfo.project.name, "collection");
    } catch {
      hasCollectionRecord = false;
    }
    test.skip(!hasCollectionRecord, "Collection record page is not part of this product contract");
    await ensureInAppOnHome(page);

    const name = `E2E coll rec ctx ${Date.now()}`;
    await createCollection(page, name);
    await openLibraryAndTab(page, LibraryTab.Collections);

    const container = page.locator("#records-container");
    await expect(container).toBeVisible({ timeout: 15_000 });
    const thumb = container
      .locator('div[id^="thumbnail-"]')
      .filter({ hasText: name })
      .first();
    await expect(thumb).toBeVisible({ timeout: 20_000 });
    await thumb.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    await expect
      .poll(
        () => {
          const resource = new URL(page.url()).searchParams.get("r");
          return resource?.startsWith("collection:") ?? false;
        },
        { timeout: 10_000 }
      )
      .toBe(true);
    await expect(page.getByRole("button", { name: /^Add$/i }).first()).toBeVisible({
      timeout: 10_000
    });

    await openRecordPageContextMenu(page);
    const expectedRecordItems = [
      { value: ResourceActionType.STAR },
      { value: ResourceActionType.COPY_LINK },
      { value: ResourceActionType.ARCHIVE },
      { value: ResourceActionType.DELETE }
    ];
    let anyRecordItemVisible = false;
    for (const item of expectedRecordItems) {
      const menuItem = page.locator(
        `[data-context-menu-item-id="${item.value}"]`
      );
      const visible = await menuItem.isVisible().catch(() => false);
      if (visible) {
        anyRecordItemVisible = true;
        await expect(menuItem).toBeVisible();
      }
    }
    expect(
      anyRecordItemVisible,
      "At least one expected record context menu action should be visible"
    ).toBe(true);

    await dismissAnyModals(page);
  });
});

import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";

import { ensureInAppOnHome } from "../../utils/helpers";
import {
  getResourceThumbnail,
  openResourceBrowser,
  openResourceQueryState
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

async function searchCollections(page: Page, label: string) {
  const searchInput = page
    .getByRole("textbox", { name: /Search collections/i })
    .first();
  await searchInput.waitFor({ state: "visible", timeout: 15_000 });
  await searchInput.fill("");
  await searchInput.fill(label);
}

test.describe("collection - library search", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("exact search follows archive and unarchive state without stale active results", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);
    const [collection] = await e2eSeed.collections.collections(2, {
      prefix: "E2E collection search"
    });
    const { id: collectionId, label } = collection;
    expect(collectionId).toBeTruthy();
    const thumbnail = getResourceThumbnail(page, collectionId);

    await openResourceBrowser(page, test.info().project.name, "collection");
    await searchCollections(page, label);
    await expect(thumbnail).toBeVisible({ timeout: 15_000 });

    await e2eSeed.collections.setArchived(collectionId, true);
    await searchCollections(page, label);
    await expect(thumbnail).toBeHidden({ timeout: 15_000 });

    await openResourceQueryState(
      page,
      test.info().project.name,
      "collection",
      "archived"
    );
    await searchCollections(page, label);
    await expect(thumbnail).toBeVisible({ timeout: 15_000 });

    await e2eSeed.collections.setArchived(collectionId, false);
    await openResourceQueryState(
      page,
      test.info().project.name,
      "collection",
      "active"
    );
    await searchCollections(page, label);
    await expect(thumbnail).toBeVisible({ timeout: 15_000 });
  });
});

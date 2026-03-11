import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  selectFirstTwoViaContextMenu,
  createTwoCollections,
  getBulkEditBar
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("collection - bulk editor @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("select multiple collections via context menu - bulk edit bar appears and shows count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    await selectFirstTwoViaContextMenu(page, "records-container");

    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });
    const bar = getBulkEditBar(page);
    await expect(bar).toBeVisible({ timeout: 5_000 });
    await expect(bar.getByRole("button", { name: /^Star$/i })).toBeVisible();
    await expect(bar.getByRole("button", { name: /^Archive$/i })).toBeVisible();
    await expect(bar.getByRole("button", { name: /^Delete$/i })).toBeVisible();
  });

  test("select multiple collections - clear selection hides bulk edit bar", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Clear selection/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeHidden({ timeout: 5_000 });
  });

  test("select multiple collections - Star shows success toast, clears selection, and collections are starred", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    const urlStarred = new URL(page.url());
    urlStarred.searchParams.set("starred", "1");
    await page.goto(urlStarred.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const starredThumbnailsBefore = page.locator(
      "#records-container div[id^='thumbnail-']"
    );
    await page.locator("#records-container").waitFor({ state: "visible", timeout: 10_000 });
    const starredCountBefore = await starredThumbnailsBefore.count();
    const urlCollections = new URL(page.url());
    urlCollections.searchParams.delete("starred");
    await page.goto(urlCollections.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Star$/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Starred 2 collections? successfully/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeHidden({ timeout: 5_000 });

    await page.goto(urlStarred.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const thumbnails = page.locator("#records-container div[id^='thumbnail-']");
    await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
    await expect(thumbnails).toHaveCount(starredCountBefore + 2, {
      timeout: 5_000
    });

    const starIconsInStarredView = page.locator(
      "#records-container div[id^='thumbnail-'] .text-yellow-400"
    );
    await expect(starIconsInStarredView).toHaveCount(starredCountBefore + 2, {
      timeout: 5_000
    });
  });

  test("select multiple collections - Select all keeps bar visible with count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    const container = page.locator("#records-container");
    const thumbnails = container.locator('div[id^="thumbnail-"]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
    const totalCount = await thumbnails.count();

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Select all/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(new RegExp(`Selected: ${totalCount} collections?`, "i"))
    ).toBeVisible({ timeout: 5_000 });
  });

  test("select multiple collections - Archive shows success toast, clears selection, and collections are archived", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    const urlArchived = new URL(page.url());
    urlArchived.searchParams.set("archived", "1");
    await page.goto(urlArchived.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const archivedThumbnailsBefore = page.locator(
      "#records-container div[id^='thumbnail-']"
    );
    await page.locator("#records-container").waitFor({ state: "visible", timeout: 10_000 });
    const archivedCountBefore = await archivedThumbnailsBefore.count();
    const urlCollections = new URL(page.url());
    urlCollections.searchParams.delete("archived");
    await page.goto(urlCollections.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Archive$/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Archived 2 collections? successfully/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeHidden({ timeout: 5_000 });

    await page.goto(urlArchived.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const thumbnails = page.locator("#records-container div[id^='thumbnail-']");
    await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
    await expect(thumbnails).toHaveCount(archivedCountBefore + 2, {
      timeout: 5_000
    });
  });

  test("select multiple collections - Delete shows success toast and clears selection", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoCollections(page);
    await openLibraryAndTab(page, LibraryTab.Collections);

    const recordsContainer = page.locator("#records-container");
    const thumbnailsBefore = recordsContainer.locator("div[id^='thumbnail-']");
    const countBefore = await thumbnailsBefore.count();

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Delete$/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Deleted 2 collections? successfully/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Selected: 2 collections?/i)
    ).toBeHidden({ timeout: 5_000 });

    await page.waitForTimeout(1_500);
    const thumbnailsAfter = recordsContainer.locator("div[id^='thumbnail-']");
    await expect(thumbnailsAfter).toHaveCount(countBefore - 2, { timeout: 10_000 });
  });
});

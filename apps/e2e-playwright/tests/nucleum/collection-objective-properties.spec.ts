import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import type { SeededObjectiveCollection } from "../shared/collection/collection-seed";
import { ensureInAppOnHome } from "../utils/helpers";

let e2eSeed: E2ESeed;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function openSeededCollection(
  page: Page,
  fixture: SeededObjectiveCollection
) {
  await page.goto(
    `/collection_browse?inline=${encodeURIComponent(
      fixture.collectionId
    )}&inlineAt=${Date.now()}`,
    { waitUntil: "domcontentloaded" }
  );
  await expect(
    page.getByText(fixture.collectionName, { exact: true }).first()
  ).toBeVisible({ timeout: 20_000 });
}

function objectiveThumbnail(page: Page, label: string) {
  return page
    .getByTestId(/^resource-thumbnail:objective:/)
    .filter({ hasText: label })
    .first();
}

function propertyTab(page: Page, label: string) {
  return page
    .getByRole("button", {
      name: new RegExp(`${escapeRegExp(label)}\\s+1`, "i")
    })
    .first();
}

function collectionSearchInput(page: Page) {
  return page.getByPlaceholder(/Search this collection/i).first();
}

test.describe("objective collection property views", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("tab-by property values render from live objective collection items", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const fixture = await e2eSeed.collections.objectivePropertyView();
    await openSeededCollection(page, fixture);

    await expect(page.getByText(fixture.propertyLabel).first()).toBeVisible({
      timeout: 20_000
    });
    await expect(propertyTab(page, fixture.alphaLabel)).toBeVisible({
      timeout: 20_000
    });
    await expect(propertyTab(page, fixture.betaLabel)).toBeVisible({
      timeout: 20_000
    });

    await propertyTab(page, fixture.alphaLabel).click({ timeout: 5_000 });
    await expect(
      objectiveThumbnail(page, fixture.alphaObjectiveLabel)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      objectiveThumbnail(page, fixture.betaObjectiveLabel)
    ).toBeHidden({ timeout: 10_000 });
  });

  test("properties shown renders selected property values on objective thumbnails", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const fixture = await e2eSeed.collections.objectivePropertyView();
    await openSeededCollection(page, fixture);

    await expect(
      objectiveThumbnail(page, fixture.alphaObjectiveLabel).filter({
        hasText: fixture.alphaLabel
      })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      objectiveThumbnail(page, fixture.betaObjectiveLabel).filter({
        hasText: fixture.betaLabel
      })
    ).toBeVisible({ timeout: 20_000 });
  });

  test("inline collection search filters objective collection items", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const fixture = await e2eSeed.collections.objectivePropertyView();
    await openSeededCollection(page, fixture);

    const searchInput = collectionSearchInput(page);
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    await searchInput.fill(fixture.alphaObjectiveLabel);

    await expect(
      objectiveThumbnail(page, fixture.alphaObjectiveLabel)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      objectiveThumbnail(page, fixture.betaObjectiveLabel)
    ).toBeHidden({ timeout: 10_000 });

    await searchInput.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A"
    );
    await searchInput.press("Backspace");

    await expect(
      objectiveThumbnail(page, fixture.alphaObjectiveLabel)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      objectiveThumbnail(page, fixture.betaObjectiveLabel)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("narrow collection title search button opens and focuses item search", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const fixture = await e2eSeed.collections.objectivePropertyView();
    await page.setViewportSize({ width: 900, height: 900 });
    await openSeededCollection(page, fixture);

    const searchButton = page
      .locator('button[title^="Search this collection"]')
      .first();
    await expect(searchButton).toBeVisible({ timeout: 20_000 });
    await searchButton.click({ timeout: 5_000 });

    const searchInput = collectionSearchInput(page);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await expect(searchInput).toBeFocused({ timeout: 10_000 });
    await searchInput.fill(fixture.betaObjectiveLabel);

    await expect(
      objectiveThumbnail(page, fixture.betaObjectiveLabel)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      objectiveThumbnail(page, fixture.alphaObjectiveLabel)
    ).toBeHidden({ timeout: 10_000 });
  });
});

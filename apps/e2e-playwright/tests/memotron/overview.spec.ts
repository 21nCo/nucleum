import { expect, test } from "@playwright/test";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import { blockExternalAuthRequests } from "../memory/memory-test-helpers";

async function openOverview(page: import("@playwright/test").Page) {
  await ensureInAppOnHome(page);
  await page.goto("/overview", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/overview(?:\/.*)?$/);
  await expect(
    page.getByText("Overview", { exact: true }).first()
  ).toBeVisible();
}

async function selectOverviewPanel(
  page: import("@playwright/test").Page,
  panel: "Graph" | "Map"
) {
  await page.getByText(panel, { exact: true }).first().click();
}

test.describe("memotron - overview panels", () => {
  test.skip(
    isCloudAuthModeActive(),
    "Empty-state assertions need a fresh offline workspace"
  );

  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("Graph exposes its empty state and orphan filter", async ({ page }) => {
    await openOverview(page);

    await expect(
      page.getByText("Graph", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("Map", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Hide orphans", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Not enough data.", { exact: true })
    ).toBeVisible();
  });

  test("Map exposes guidance when captured nodes have no location", async ({
    page
  }) => {
    await openOverview(page);
    await selectOverviewPanel(page, "Map");

    await expect(
      page.getByText("No nodes with location data found.", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Please make sure location permission is enabled while capturing a node.",
        { exact: true }
      )
    ).toBeVisible();
  });

  test("selected panel persists across an app reload", async ({ page }) => {
    await openOverview(page);
    await selectOverviewPanel(page, "Map");
    await expect(
      page.getByText("No nodes with location data found.", { exact: true })
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("No nodes with location data found.", { exact: true })
    ).toBeVisible();

    await selectOverviewPanel(page, "Graph");
    await expect(
      page.getByText("Not enough data.", { exact: true })
    ).toBeVisible();
  });
});

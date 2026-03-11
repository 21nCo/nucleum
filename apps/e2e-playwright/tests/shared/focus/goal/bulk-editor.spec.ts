import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  selectFirstTwoViaContextMenu,
  createTwoGoals,
  getBulkEditBar
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("goal - bulk editor @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("select multiple goals via context menu - bulk edit bar appears and shows count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoGoals(page);
    await openLibraryAndTab(page, LibraryTab.Goals);

    await selectFirstTwoViaContextMenu(page, "records-container");

    await expect(
      page.getByText(/Selected: 2 goals?/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("select multiple goals - clear selection hides bulk edit bar", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoGoals(page);
    await openLibraryAndTab(page, LibraryTab.Goals);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 goals?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Clear selection/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Selected: 2 goals?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple goals - Star shows success toast and clears selection", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoGoals(page);
    await openLibraryAndTab(page, LibraryTab.Goals);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 goals?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Star$/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Starred 2 goals? successfully/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Selected: 2 goals?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple goals - Select all keeps bar visible with count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoGoals(page);
    await openLibraryAndTab(page, LibraryTab.Goals);

    const container = page.locator("#records-container");
    const thumbnails = container.locator('div[id^="thumbnail-"]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
    const totalCount = await thumbnails.count();

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 goals?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Select all/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(new RegExp(`Selected: ${totalCount} goals?`, "i"))
    ).toBeVisible({ timeout: 5_000 });
  });
});

import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  openLibraryAndTab,
  LibraryTab
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("collection - all workflows @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("create collection via command bar, then verify in Library", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const collectionName = `E2E collection cmd ${Date.now()}`;
    await runCommand(page, "Create a new collection");
    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(collectionName);
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    const modal = page.locator("#collection_create");
    const saveBtn = modal.getByRole("button", { name: /Save.*Enter/i });
    await saveBtn.click({ timeout: 5_000 });
    await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await openLibraryAndTab(page, LibraryTab.Collections);
    await expect(
      page.getByText(collectionName, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create collection via UI (Library -> Collections -> New collection), then verify in Library", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const collectionName = `E2E collection UI ${Date.now()}`;
    await openLibraryAndTab(page, LibraryTab.Collections);

    const newCollectionBtn = page
      .getByRole("button", { name: /New collection|Create a new collection/i })
      .first();
    await newCollectionBtn.click({ timeout: 10_000 });

    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(collectionName);
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    const modal = page.locator("#collection_create");
    const saveBtn = modal.getByRole("button", { name: /Save.*Enter/i });
    await saveBtn.click({ timeout: 5_000 });
    await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await expect(
      page.getByText(collectionName, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test.describe("browse from library", () => {
    test("open Library → Collections and see collections list", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);
      await openLibraryAndTab(page, LibraryTab.Collections);
      const recordsContainer = page.locator("#records-container");
      await expect(recordsContainer).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("browse from pinned resource browser", () => {
    test.skip("browse collections from pinned", async ({ page }) => {
      await ensureInAppOnHome(page);
      // No dedicated "pinned collections" list in app; collections can be pinned to app menu (product-specific). N/A.
    });
  });

  test.skip("collection workflows", async ({ page }) => {
    await ensureInAppOnHome(page);
    // TODO: collection browse, edit, etc.
  });
});

import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  openLibraryAndTab,
  LibraryTab,
  getProductConfig
} from "../../utils/helpers";
import {
  getResourceContract,
  requireResourceRecordContract
} from "../../utils/resource-matrix";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("collection - all workflows @regression @smoke @library-smoke", () => {
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
    test("pin Collections in resource browser (leftnav settings), then open Collections from pinned nav", async ({
      page
    }, testInfo) => {
    test.setTimeout(120_000);
      const productConfig = getProductConfig(testInfo.project.name);
      const collectionContract = getResourceContract(
        testInfo.project.name,
        "collection"
      );
      test.skip(
        !collectionContract.pinnedBrowserEnabled,
        "Collections cannot be pinned in this product"
      );
      await ensureInAppOnHome(page);

      await page.getByTestId("leftnav-settings").click({ timeout: 5_000 });
      await expect(page.getByText("Pin resources").first()).toBeVisible({
        timeout: 8_000
      });

      const collectionsRow = page
        .getByTestId("leftnav-pin-resource")
        .filter({ hasText: /Collections/i });
      await expect(collectionsRow.first()).toBeVisible({ timeout: 8_000 });

      const toggle = collectionsRow.locator('input[type="checkbox"]').first();
      const checked = await toggle.isChecked().catch(() => false);
      if (!checked) {
        await collectionsRow.locator("label").first().click({ timeout: 2_000 });
        await page.waitForTimeout(300);
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      await page
        .getByRole("button", { name: /^Collections(\s+\d+)?$/i })
        .first()
        .click({ timeout: 10_000 });
      await page.waitForTimeout(800);

      await expect(page.locator("#records-container")).toBeVisible({
        timeout: 15_000
      });
    });
  });

  test("open collection detail page from Library and verify content visible (or N/A if no detail page)", async ({
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

    const collectionName = `E2E collection open ${Date.now()}`;
    await runCommand(page, "Create a new collection");
    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(collectionName);
    const modal = page.locator("#collection_create");
    await modal.getByRole("button", { name: /Save.*Enter/i }).click({ timeout: 5_000 });
    await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await openLibraryAndTab(page, LibraryTab.Collections);
    const container = page.locator("#records-container");
    await expect(container).toBeVisible({ timeout: 15_000 });

    // Avoid union/or locators to keep strict-mode stable.
    const thumb = container.locator('div[id^="thumbnail-"]').filter({ hasText: collectionName }).first();
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

    await expect(page.getByText(collectionName).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByRole("button", { name: /^Add$/i }).first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("rename collection from record UI (or N/A if no rename UI exposed)", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const collectionContract = getResourceContract(
      testInfo.project.name,
      "collection"
    );
    test.skip(
      !collectionContract.renameEnabled,
      "Collection rename UI is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const collectionName = `E2E collection edit ${Date.now()}`;
    await runCommand(page, "Create a new collection");
    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(collectionName);
    await page.locator("#collection_create").getByRole("button", { name: /Save.*Enter/i }).click({ timeout: 5_000 });
    await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await openLibraryAndTab(page, LibraryTab.Collections);
    const container = page.locator("#records-container");
    await expect(container).toBeVisible({ timeout: 15_000 });

    const thumb = container.locator('div[id^="thumbnail-"]').filter({ hasText: collectionName }).first();
    await expect(thumb).toBeVisible({ timeout: 20_000 });
    await thumb.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    const updatedName = `${collectionName} updated`;
    const editBtn = page
      .locator("button")
      .filter({
        has: page.locator('use[href*="pencil-simple-line-light"]')
      })
      .first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const editInput = page.locator('input[placeholder="Collection title"]:visible').first();
    await expect(editInput).toBeVisible({ timeout: 10_000 });
    await editInput.fill(updatedName);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^Close edit mode$/i }).first().click({
      timeout: 8_000
    });
    await editInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await openLibraryAndTab(page, LibraryTab.Collections);
    await expect(page.getByText(updatedName, { exact: true }).first()).toBeVisible({
      timeout: 20_000
    });
  });
});

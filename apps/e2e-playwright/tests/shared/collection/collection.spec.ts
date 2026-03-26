import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  runCommand,
  openLibraryAndTab,
  LibraryTab
} from "../../utils/helpers";
import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";

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
    test("pin Collections in resource browser (leftnav settings), then open Collections from pinned nav", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      await page.getByTestId("leftnav-settings").click({ timeout: 5_000 });

      const pinDialogVisible = await page
        .getByText("Pin resources")
        .first()
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!pinDialogVisible) test.skip(true, "Pinned resource browser not available in this product build");

      const collectionsRow = page
        .getByTestId("leftnav-pin-resource")
        .filter({ hasText: /Collections/i });

      const hasCollectionsToggle = await collectionsRow
        .first()
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!hasCollectionsToggle) test.skip(true, "Collections cannot be pinned (N/A)");

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
  }) => {
    test.setTimeout(120_000);
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

    const hasClose = await page
      .getByRole("button", { name: /Close/i })
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasClose) test.skip(true, "No collection detail/record page available (N/A)");

    await expect(page.getByText(collectionName).first()).toBeVisible({
      timeout: 15_000
    });
  });

  test("rename collection from record UI (or N/A if no rename UI exposed)", async ({
    page
  }) => {
    test.setTimeout(120_000);
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

    // Best-effort rename flow:
    // 1) Look for an edit input already present (inline edit / edit modal).
    // 2) Otherwise click an "Edit"/"Rename" button if present.
    const existingEditInput = page.locator('input[placeholder="Name of the collection"]:visible').first();
    const hasExistingEditInput = await existingEditInput
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasExistingEditInput) {
      const editBtn = page
        .getByRole("button", { name: /^(Edit|Rename|Edit collection|Rename collection)$/i })
        .first();
      const hasEditBtn = await editBtn
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (hasEditBtn) {
        await editBtn.click({ timeout: 5_000 });
        await page.waitForTimeout(500);
      } else {
        test.skip(true, "Collection rename UI not exposed (N/A)");
      }
    }

    const editInput = page.locator('input[placeholder="Name of the collection"]:visible').first();
    await expect(editInput).toBeVisible({ timeout: 10_000 });
    await editInput.fill(updatedName);

    const saveCandidates = page.getByRole("button", { name: /Save.*Enter/i });
    const saveCount = await saveCandidates.count();
    let saveBtn = saveCandidates.first();
    for (let i = 0; i < saveCount; i += 1) {
      const candidate = saveCandidates.nth(i);
      if (await candidate.isVisible().catch(() => false)) {
        saveBtn = candidate;
        break;
      }
    }

    await saveBtn.click({ timeout: 8_000 });
    await editInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

    await openLibraryAndTab(page, LibraryTab.Collections);
    await expect(page.getByText(updatedName, { exact: true }).first()).toBeVisible({
      timeout: 20_000
    });
  });
});

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";
import {
  getResourceRecordsContainer,
  openResourceBrowser,
  openResourceRecord,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

test.describe("collection - all workflows @creation @browse @smoke", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
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
    await titleInput
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => null);

    await openResourceBrowser(page, test.info().project.name, "collection");
    await expect(
      page.getByText(collectionName, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await openResourceBrowser(page, test.info().project.name, "collection");
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
    await openResourceBrowser(page, test.info().project.name, "collection");

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
    await titleInput
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => null);

    await expect(
      page.getByText(collectionName, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await openResourceBrowser(page, test.info().project.name, "collection");
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
      const contract = await openResourceBrowser(
        page,
        test.info().project.name,
        "collection"
      );
      const recordsContainer = getResourceRecordsContainer(page, contract);
      await expect(recordsContainer).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("browse from pinned resource browser", () => {
    test("pin Collections in resource browser (leftnav settings), then open Collections from pinned nav", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);
      test.skip(
        (await page.getByTestId("leftnav-settings").count()) === 0,
        "Left navigation resource customization is disabled"
      );

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
      }
      await expect(toggle).toBeChecked({ timeout: 5_000 });

      await page.keyboard.press("Escape");
      await page.getByTestId("leftnav-settings").click({ timeout: 5_000 });
      await expect(
        page
          .getByTestId("leftnav-pin-resource")
          .filter({ hasText: /Collections/i })
          .locator('input[type="checkbox"]')
          .first()
      ).toBeChecked({ timeout: 5_000 });
      await page.keyboard.press("Escape");

      await page
        .getByRole("button", { name: /^Collections(\s+\d+)?$/i })
        .first()
        .click({ timeout: 10_000 });

      const contract = requireResourceBrowseContract(
        test.info().project.name,
        "collection"
      );
      await expect(getResourceRecordsContainer(page, contract)).toBeVisible({
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
    await e2eSeed.collections.collection({ label: collectionName });

    await openResourceRecord(page, test.info().project.name, "collection", {
      label: collectionName
    });

    await expect
      .poll(
        () => {
          const resource = new URL(page.url()).searchParams.get("r");
          return resource?.startsWith("collection:") ?? false;
        },
        {
          message:
            "open collection detail page from Library and verify content v...: toBe true",
          timeout: 10_000
        }
      )
      .toBe(true);

    await expect(page.getByText(collectionName).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(
      page.getByRole("button", { name: /^Add$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });
  });

  test("rename collection from record UI (or N/A if no rename UI exposed)", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const collectionContract = requireResourceBrowseContract(
      testInfo.project.name,
      "collection"
    );
    test.skip(
      !collectionContract.renameEnabled,
      "Collection rename UI is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const collectionName = `E2E collection edit ${Date.now()}`;
    await e2eSeed.collections.collection({ label: collectionName });

    await openResourceRecord(page, test.info().project.name, "collection", {
      label: collectionName
    });

    const updatedName = `${collectionName} updated`;
    const editBtn = page
      .locator("button")
      .filter({
        has: page.locator('use[href*="pencil-simple-line-light"]')
      })
      .first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click({ timeout: 5_000 });

    const editInput = page
      .locator('input[placeholder="Collection title"]:visible')
      .first();
    await expect(editInput).toBeVisible({ timeout: 10_000 });
    await editInput.fill(updatedName);
    await page
      .getByRole("button", { name: /^Close edit mode$/i })
      .first()
      .click({
        timeout: 8_000
      });
    await editInput
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => null);
    await expect(
      page.getByText(updatedName, { exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await openResourceRecord(page, test.info().project.name, "collection", {
      label: updatedName
    });
    await expect(
      page.getByText(updatedName, { exact: true }).first()
    ).toBeVisible({
      timeout: 20_000
    });
  });
});

import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  createNodeViaCapture,
  expectNodeVisibleInLibrary,
  expectSavedNodeRecordVisible,
  fillCapture,
  getLinkSearchResult,
  getLinkedNodeItem,
  openCapture,
  openNodeRecordFromLibrary,
  saveCapture
} from "../memory-test-helpers";

let e2eSeed: E2ESeed;

test.describe("nodes - creation flows @creation", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
  });

  test("create node via command bar", async ({ page }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const nodeText = `E2E node cmd ${Date.now()}`;
    await createNodeViaCapture(page, {
      close: false,
      entryPoint: "command",
      label: nodeText
    });
    await expectSavedNodeRecordVisible(page, nodeText);
    await closeNodeRecord(page);
    await expectNodeVisibleInLibrary(page, nodeText);
  });

  test("create node via UI", async ({ page }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const nodeText = `E2E node UI ${Date.now()}`;
    await createNodeViaCapture(page, {
      close: false,
      entryPoint: "ui",
      label: nodeText
    });
    await expectSavedNodeRecordVisible(page, nodeText);
    await closeNodeRecord(page);
    await expectNodeVisibleInLibrary(page, nodeText);
  });

  test("create capture with direct link and verify saved node reopens with linked item", async ({
    page
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await ensureInAppOnHome(page);

    const targetNodeTitle = `E2E capture link target ${Date.now()}`;
    const sourceNodeTitle = `E2E capture link source ${Date.now()}`;

    await e2eSeed.memory.node({
      content: targetNodeTitle,
      label: targetNodeTitle
    });

    await openCapture(page, "ui");
    await fillCapture(page, sourceNodeTitle, sourceNodeTitle);

    const linksToggle = page.getByRole("button", { name: /Links/i }).first();
    await linksToggle.click({ timeout: 5_000 });

    const linkSearch = page
      .getByPlaceholder(/Link to a node or add to a collection/i)
      .first();
    await linkSearch.fill(targetNodeTitle);
    const linkResult = getLinkSearchResult(page, targetNodeTitle);
    await expect(linkResult).toBeVisible({ timeout: 15_000 });
    await linkResult.click({ timeout: 5_000 });

    expect(
      pageErrors.filter((message) =>
        message.includes("effect_update_depth_exceeded")
      )
    ).toEqual([]);

    await saveCapture(page, { close: false });
    await expectSavedNodeRecordVisible(page, sourceNodeTitle);

    const linksTab = page
      .getByRole("tab", { name: /^Links$/i })
      .or(page.getByRole("button", { name: /^Links$/i }))
      .first();
    await linksTab.click({ timeout: 5_000 });
    await expect(getLinkedNodeItem(page, targetNodeTitle)).toBeVisible({
      timeout: 15_000
    });

    await closeNodeRecord(page);
    await openNodeRecordFromLibrary(page, sourceNodeTitle);
    await linksTab.click({ timeout: 5_000 });
    await expect(getLinkedNodeItem(page, targetNodeTitle)).toBeVisible({
      timeout: 15_000
    });
    expect(pageErrors).toEqual([]);
  });
});

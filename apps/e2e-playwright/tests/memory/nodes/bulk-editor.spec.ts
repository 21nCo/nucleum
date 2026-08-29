import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  selectFirstTwoViaContextMenu,
  getBulkEditBar
} from "../../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodesLibrary
} from "../memory-test-helpers";
import {
  getResourceThumbnail,
  getResourceThumbnails,
  openResourceQueryState,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

test.describe("nodes - bulk editor @bulk-editor", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
  });

  test("select multiple nodes via context menu - bulk edit bar appears and shows count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await e2eSeed.memory.nodes(2, { prefix: "E2E bulk node" });
    await openNodesLibrary(page);

    await selectFirstTwoViaContextMenu(page, "node");

    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeVisible({
      timeout: 10_000
    });
  });

  test("select multiple nodes - clear selection hides bulk edit bar", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await e2eSeed.memory.nodes(2, { prefix: "E2E bulk node" });
    await openNodesLibrary(page);

    await selectFirstTwoViaContextMenu(page, "node");
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeVisible({
      timeout: 10_000
    });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Clear selection/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple nodes - Star shows success toast and clears selection", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const nodes = await e2eSeed.memory.nodes(2, {
      prefix: "E2E bulk node"
    });
    await openNodesLibrary(page);

    await selectFirstTwoViaContextMenu(page, "node");
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeVisible({
      timeout: 10_000
    });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Star$/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Starred 2 nodes? successfully/i)).toBeVisible({
      timeout: 10_000
    });
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeHidden({
      timeout: 5_000
    });

    await openResourceQueryState(
      page,
      test.info().project.name,
      "node",
      "starred"
    );
    for (const node of nodes) {
      await expect(getResourceThumbnail(page, node.id)).toBeVisible({
        timeout: 15_000
      });
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await openNodesLibrary(page);
    await openResourceQueryState(
      page,
      test.info().project.name,
      "node",
      "starred"
    );
    for (const node of nodes) {
      await expect(getResourceThumbnail(page, node.id)).toBeVisible({
        timeout: 15_000
      });
    }
  });

  test("select multiple nodes - Select all updates count to all items", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await e2eSeed.memory.nodes(2, { prefix: "E2E bulk node" });
    await openNodesLibrary(page);

    requireResourceBrowseContract(test.info().project.name, "node");
    const thumbnails = getResourceThumbnails(page);
    await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
    const totalCount = await thumbnails.count();

    await selectFirstTwoViaContextMenu(page, "node");
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeVisible({
      timeout: 10_000
    });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Select all/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(new RegExp(`Selected: ${totalCount} nodes?`, "i"))
    ).toBeVisible({ timeout: 5_000 });
  });
});

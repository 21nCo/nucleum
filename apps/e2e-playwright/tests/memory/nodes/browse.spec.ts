import { test, expect } from "@playwright/test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodesLibrary
} from "../memory-test-helpers";
import {
  getResourceRecordsContainer,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

test.describe("nodes - browse flows @browse", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("open Library → Nodes and see nodes list @smoke", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);
    await openNodesLibrary(page);
    const contract = requireResourceBrowseContract(
      test.info().project.name,
      "node"
    );
    const recordsContainer = getResourceRecordsContainer(page, contract);
    await expect(recordsContainer).toBeVisible({ timeout: 15_000 });
  });
});

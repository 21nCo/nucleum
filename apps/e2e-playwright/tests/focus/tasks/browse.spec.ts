import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { getResourceThumbnail } from "../../utils/resource-matrix";
import {
  ensureInAppOnHome,
  LibraryTab,
  openLibraryAndTab
} from "../../utils/helpers";
import { blockGoogleAccountsNavigation } from "../focus-test-helpers";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("open Library → Tasks and see task in list @browse", async ({ page }) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const taskName = `E2E browse task ${Date.now()}`;
  const task = await e2eSeed.focus.task({ label: taskName });

  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(getResourceThumbnail(page, task.id)).toBeVisible({
    timeout: 15_000
  });
});

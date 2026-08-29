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

test("from library - open Library → Objectives and see objective in list @browse @smoke", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);
  const objectiveName = `E2E browse objective ${Date.now()}`;
  const objective = await e2eSeed.focus.objective({ label: objectiveName });

  await openLibraryAndTab(page, LibraryTab.Objectives);
  await expect(getResourceThumbnail(page, objective.id)).toBeVisible({
    timeout: 15_000
  });
});

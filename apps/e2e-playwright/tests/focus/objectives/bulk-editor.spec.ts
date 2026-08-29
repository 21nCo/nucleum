import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  selectFirstTwoViaContextMenu,
  getBulkEditBar
} from "../../utils/helpers";
import {
  blockGoogleAccountsNavigation,
  openObjectiveLibrary
} from "../focus-test-helpers";
import {
  getResourceThumbnails,
  getResourceThumbnail,
  openResourceQueryState,
  requireResourceBrowseContract
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("select multiple objectives via context menu - bulk edit bar appears and shows count @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.objectives(2, { prefix: "E2E bulk objective" });
  await openObjectiveLibrary(page);

  await selectFirstTwoViaContextMenu(page, "objective");

  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeVisible({
    timeout: 10_000
  });
});

test("select multiple objectives - clear selection hides bulk edit bar @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.objectives(2, { prefix: "E2E bulk objective" });
  await openObjectiveLibrary(page);

  await selectFirstTwoViaContextMenu(page, "objective");
  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /Clear selection/i })
    .click({ timeout: 5_000 });
  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeHidden({
    timeout: 5_000
  });
});

test("select multiple objectives - Star shows success toast and clears selection @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  const objectives = await e2eSeed.focus.objectives(2, {
    prefix: "E2E bulk objective"
  });
  await openObjectiveLibrary(page);

  await selectFirstTwoViaContextMenu(page, "objective");
  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /^Star$/i })
    .click({ timeout: 5_000 });
  await expect(
    page.getByText(/Starred 2 objectives? successfully/i)
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeHidden({
    timeout: 5_000
  });

  await openResourceQueryState(
    page,
    test.info().project.name,
    "objective",
    "starred"
  );
  for (const objective of objectives) {
    await expect(getResourceThumbnail(page, objective.id)).toBeVisible({
      timeout: 15_000
    });
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openObjectiveLibrary(page);
  await openResourceQueryState(
    page,
    test.info().project.name,
    "objective",
    "starred"
  );
  for (const objective of objectives) {
    await expect(getResourceThumbnail(page, objective.id)).toBeVisible({
      timeout: 15_000
    });
  }
});

test("select multiple objectives - Select all keeps bar visible with count @bulk-editor", async ({
  page
}) => {
  test.setTimeout(90_000);
  await ensureInAppOnHome(page);
  await e2eSeed.focus.objectives(2, { prefix: "E2E bulk objective" });
  await openObjectiveLibrary(page);

  requireResourceBrowseContract(test.info().project.name, "objective");
  const thumbnails = getResourceThumbnails(page);
  await expect(thumbnails.first()).toBeVisible({ timeout: 10_000 });
  const totalCount = await thumbnails.count();

  await selectFirstTwoViaContextMenu(page, "objective");
  await expect(page.getByText(/Selected: 2 objectives?/i)).toBeVisible({
    timeout: 10_000
  });

  await getBulkEditBar(page)
    .getByRole("button", { name: /Select all/i })
    .click({ timeout: 5_000 });
  await expect(
    page.getByText(new RegExp(`Selected: ${totalCount} objectives?`, "i"))
  ).toBeVisible({ timeout: 5_000 });
});

import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  selectFirstTwoViaContextMenu,
  createTwoNodesViaCapture,
  getBulkEditBar
} from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("node - bulk editor @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("select multiple nodes via drag → bulk edit bar appears and shows count", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoNodesViaCapture(page);
    await openLibraryAndTab(page, LibraryTab.Nodes);

    await selectFirstTwoViaContextMenu(page, "records-container");

    await expect(
      page.getByText(/Selected: 2 nodes?/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("select multiple nodes → clear selection hides bulk edit bar", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoNodesViaCapture(page);
    await openLibraryAndTab(page, LibraryTab.Nodes);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 nodes?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Clear selection/i })
      .click({ timeout: 5_000 });
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple nodes → Star shows success toast and clears selection", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoNodesViaCapture(page);
    await openLibraryAndTab(page, LibraryTab.Nodes);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 nodes?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /^Star$/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Starred 2 nodes? successfully/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Selected: 2 nodes?/i)).toBeHidden({
      timeout: 5_000
    });
  });

  test("select multiple nodes → Select all updates count to all items", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await createTwoNodesViaCapture(page);
    await openLibraryAndTab(page, LibraryTab.Nodes);

    await selectFirstTwoViaContextMenu(page, "records-container");
    await expect(
      page.getByText(/Selected: 2 nodes?/i)
    ).toBeVisible({ timeout: 10_000 });

    await getBulkEditBar(page)
      .getByRole("button", { name: /Select all/i })
      .click({ timeout: 5_000 });
    await expect(
      page.getByText(/Selected: 2 nodes?/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});

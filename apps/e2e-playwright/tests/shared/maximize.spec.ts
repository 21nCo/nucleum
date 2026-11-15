import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { ensureInAppOnHome } from "../utils/helpers";
import { getResourceThumbnail } from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById,
  openNodesLibrary
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

test.describe("maximize", () => {
  test.beforeEach(async ({ page, seed }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The maximized page is a node opened from the Nodes library, and this product has no nodes"
    );
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("a maximized page keeps a minimal top bar and Minimize restores it", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E maximize ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);

    const tabs = page.getByTestId("resource-context-tabs");
    await expect(tabs).toBeVisible({ timeout: 15_000 });
    await expect(tabs.getByRole("button", { name: /maximize/i })).toHaveCount(
      0
    );

    await tabs.getByRole("button", { name: "Actions" }).click();
    await page
      .locator('[data-context-menu-item-id="open-in-full-screen"]')
      .click();

    const minimize = page.getByTestId("top-bar-close");
    await expect(minimize).toHaveAttribute("aria-label", "Minimize");
    await expect(page.getByRole("button", { name: "Command bar" })).toHaveCount(
      0
    );
    await expect(page.getByTestId("top-bar-indicators")).toHaveCount(0);
    await expect(page.getByTestId("resource-context-tabs")).toBeVisible();

    await minimize.click();
    await expect(page).not.toHaveURL(/[?&]max=/);
    await expect(page.getByTestId("resource-record-surface")).toBeVisible();
    await expect(page.getByTestId("top-bar-close")).toHaveAttribute(
      "aria-label",
      "Close"
    );
    await expect(
      page.getByRole("button", { name: "Command bar" })
    ).toBeVisible();
  });

  test("Minimize returns a page opened straight into full screen to where it was opened from", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E maximize origin ${Date.now()}`
    });
    await openNodesLibrary(page);
    const origin = page.url();
    expect(origin).not.toMatch(/[?&]page=/);

    await getResourceThumbnail(page, node.id).click({
      modifiers: ["Shift"],
      timeout: 5_000
    });
    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 15_000
    });
    await expect(page).toHaveURL(/[?&]max=/);
    const minimize = page.getByTestId("top-bar-close");
    await expect(minimize).toHaveAttribute("aria-label", "Minimize");

    await minimize.click();
    await expect(page).toHaveURL(origin);
    await expect(page.getByTestId("resource-record-surface")).toHaveCount(0);
    await expect(getResourceThumbnail(page, node.id)).toBeVisible();
  });
});

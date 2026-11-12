import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

test.describe("maximize", () => {
  test.beforeEach(async ({ page, seed }) => {
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
});

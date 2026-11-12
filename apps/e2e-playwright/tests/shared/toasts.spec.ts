import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { ensureInAppOnHome } from "../utils/helpers";
import { openSettings } from "../utils/settings";
import {
  getResourceContextMenuTrigger,
  getResourceThumbnail
} from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  openNodesLibrary
} from "../memory/memory-test-helpers";

const TOAST_DURATION_MS = 3_500;

let e2eSeed: E2ESeed;

async function copyNodeLink(page: Page, nodeId: string) {
  const row = getResourceThumbnail(page, nodeId);
  await row.waitFor({ state: "visible", timeout: 15_000 });
  await row.hover();
  const trigger = getResourceContextMenuTrigger(row);
  await trigger.waitFor({ state: "visible", timeout: 8_000 });
  await trigger.click({ timeout: 5_000 });
  const item = page.locator(
    `[data-context-menu-item-id="${ResourceActionType.COPY_LINK}"]`
  );
  await item.waitFor({ state: "visible", timeout: 5_000 });
  await item.click();
}

test.describe("toasts", () => {
  test.beforeEach(async ({ page, seed, context }) => {
    e2eSeed = seed;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await blockExternalAuthRequests(page);
  });

  test("toasts stay above an open modal, pause on hover and open the list on click", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);

    const first = await e2eSeed.memory.node({
      label: `E2E toast first ${Date.now()}`
    });
    const second = await e2eSeed.memory.node({
      label: `E2E toast second ${Date.now()}`
    });
    await openNodesLibrary(page);

    await copyNodeLink(page, first.id);
    await copyNodeLink(page, second.id);

    const topBarToasts = page.getByTestId("top-bar-toasts");
    await expect(topBarToasts.getByTestId("top-bar-toast-count")).toHaveText(
      "2"
    );
    await topBarToasts.getByTestId("top-bar-toast-latest").hover();
    await expect(
      topBarToasts.getByTestId("top-bar-toast-dismiss")
    ).toBeVisible();

    await openSettings(page);

    const raised = page.getByTestId("modal-raised-toasts");
    await expect(raised).toBeVisible();
    await expect(page.getByTestId("top-bar-toasts")).toHaveCount(1);
    await raised.getByTestId("top-bar-toast-latest").hover();

    const hoverStartedAt = Date.now();
    await expect(async () => {
      expect(Date.now() - hoverStartedAt).toBeGreaterThan(
        TOAST_DURATION_MS + 500
      );
      await expect(raised.getByTestId("top-bar-toast-latest")).toContainText(
        /link copied/i,
        { timeout: 100 }
      );
    }, "hovered toast outlives its auto-dismiss time").toPass({
      timeout: TOAST_DURATION_MS + 5_000
    });

    await raised
      .getByTestId("top-bar-toast-latest")
      .getByRole("button")
      .first()
      .click();
    const list = raised.getByTestId("top-bar-toast-list");
    await expect(list).toBeVisible();
    await expect(list.getByText(/link copied/i)).toHaveCount(2);
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();

    await list
      .getByRole("button", { name: "Dismiss notification" })
      .first()
      .click();
    await expect(list).toBeHidden();
    await expect(raised.getByTestId("top-bar-toast-count")).toBeHidden();
    await raised.getByTestId("top-bar-toast-latest").hover();
    await raised.getByTestId("top-bar-toast-dismiss").click();
    await expect(raised).toBeHidden();
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();

    await page.getByTestId("modal-close").first().click();
    await expect(page.getByTestId("settings-sidebar")).toBeHidden();

    await copyNodeLink(page, first.id);
    const latest = page
      .getByTestId("top-bar-toasts")
      .getByTestId("top-bar-toast-latest");
    await expect(latest).toContainText(/link copied/i);
    await expect(raised).toBeHidden();
    await page.mouse.move(10, 600);
    await expect(latest).toBeHidden({ timeout: TOAST_DURATION_MS + 3_000 });
  });
});

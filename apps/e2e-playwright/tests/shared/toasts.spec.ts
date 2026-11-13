import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
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

/** Presses Tab until `target` has focus, failing after `maxPresses`. */
async function tabUntilFocused(page: Page, target: Locator, maxPresses = 80) {
  for (let presses = 0; presses < maxPresses; presses++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement))
      return;
  }
  throw new Error(`Tab did not reach the target in ${maxPresses} presses`);
}

/**
 * Copies two node links and carries their toasts, hovered so they stay, into
 * Settings and the Appearance drawer.
 */
async function carryTwoToastsIntoDrawer(page: Page, nodeIds: [string, string]) {
  await copyNodeLink(page, nodeIds[0]);
  await copyNodeLink(page, nodeIds[1]);
  const topBarCount = page
    .getByTestId("top-bar-toasts")
    .getByTestId("top-bar-toast-count");
  await expect(topBarCount).toHaveText("2");
  await topBarCount.hover();

  await openSettings(page);
  const raised = page.getByTestId("modal-raised-toasts");
  await raised.getByTestId("top-bar-toast-count").hover();
  const drawer = await openAppearanceDrawer(page);
  await raised.getByTestId("top-bar-toast-count").hover();
  return { raised, drawer };
}

/** Carries two toasts into the Appearance drawer and opens their list. */
async function openRaisedListBesideDrawer(
  page: Page,
  nodeIds: [string, string]
) {
  const { raised } = await carryTwoToastsIntoDrawer(page, nodeIds);
  await raised.getByTestId("top-bar-toast-count").click();
  const list = raised.getByTestId("top-bar-toast-list");
  await expect(list).toBeVisible();
  await expect(list.getByText(/link copied/i)).toHaveCount(2);
  return list;
}

async function openAppearanceDrawer(page: Page) {
  await page
    .getByTestId("settings-sidebar")
    .getByRole("button", { name: /^Appearance$/i })
    .click({ timeout: 5_000 });
  const drawer = page.getByTestId("modal-appearance-settings");
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  return drawer;
}

/** Selects `style` in the Appearance drawer, opening Settings if needed. */
async function selectAppStyle(page: Page, style: string) {
  const drawer = page.getByTestId("modal-appearance-settings");
  if (!(await drawer.isVisible())) {
    await openSettings(page);
    await openAppearanceDrawer(page);
  }
  const option = drawer.locator(`[data-app-style-option="${style}"]`);
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
}

/** Asserts the expanded list lies fully on screen and left of the drawer. */
async function expectListBesideDrawer(page: Page, list: Locator) {
  await expect(async () => {
    const listBox = await list.boundingBox();
    const drawerBox = await page
      .getByTestId("modal-appearance-settings")
      .boundingBox();
    const viewport = page.viewportSize();
    expect(listBox && drawerBox && viewport).toBeTruthy();
    expect(listBox!.x).toBeGreaterThanOrEqual(0);
    expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(drawerBox!.x);
    expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(viewport!.height);
  }, "the raised toast list stays on screen beside the drawer").toPass({
    timeout: 5_000
  });
  for (const dismiss of await list
    .getByRole("button", { name: "Dismiss notification" })
    .all())
    await expect(dismiss).toBeInViewport({ ratio: 1 });
}

test.describe("toasts", () => {
  test.beforeEach(async ({ page, seed, context }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "Toasts are raised by copying node links, and this product has no nodes"
    );
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
    await raised.getByTestId("top-bar-toast-count").hover();

    const hoverStartedAt = Date.now();
    await expect(async () => {
      expect(Date.now() - hoverStartedAt).toBeGreaterThan(
        TOAST_DURATION_MS + 500
      );
      await expect(raised.getByTestId("top-bar-toast-latest")).toContainText(
        /link copied/i,
        { timeout: 100 }
      );
    }, "toasts outlive their auto-dismiss time while the count is hovered").toPass(
      {
        timeout: TOAST_DURATION_MS + 5_000
      }
    );

    await raised
      .getByTestId("top-bar-toast-latest")
      .getByRole("button")
      .first()
      .click();
    const list = raised.getByTestId("top-bar-toast-list");
    await expect(list).toBeVisible();
    await expect(list.getByText(/link copied/i)).toHaveCount(2);
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
    await raised.getByTestId("top-bar-toast-count").click();
    await expect(list).toBeVisible();

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

  test("raised toasts sit beside the Appearance drawer and stay usable over it", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 800 });
    await ensureInAppOnHome(page);

    const node = await e2eSeed.memory.node({
      label: `E2E toast drawer ${Date.now()}`
    });
    await openNodesLibrary(page);
    await copyNodeLink(page, node.id);
    await page
      .getByTestId("top-bar-toasts")
      .getByTestId("top-bar-toast-latest")
      .hover();

    await openSettings(page);
    const raised = page.getByTestId("modal-raised-toasts");
    await raised.getByTestId("top-bar-toast-latest").hover();
    const drawer = await openAppearanceDrawer(page);
    const latest = raised.getByTestId("top-bar-toast-latest");
    await latest.hover();
    await expect(latest).toContainText(/link copied/i);
    await expect(page.getByTestId("top-bar-toasts")).toHaveCount(1);

    const toastBox = await raised.getByTestId("top-bar-toasts").boundingBox();
    const drawerBox = await drawer.boundingBox();
    expect(toastBox && drawerBox).toBeTruthy();
    expect(toastBox!.x + toastBox!.width).toBeLessThanOrEqual(drawerBox!.x);

    await raised.getByTestId("top-bar-toast-dismiss").click();
    await expect(raised).toBeHidden();
    await expect(drawer).toBeVisible();
  });

  test("raised toasts over the Appearance drawer work from the keyboard", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 800 });
    await ensureInAppOnHome(page);

    const first = await e2eSeed.memory.node({
      label: `E2E toast keys first ${Date.now()}`
    });
    const second = await e2eSeed.memory.node({
      label: `E2E toast keys second ${Date.now()}`
    });
    await openNodesLibrary(page);
    const { raised, drawer } = await carryTwoToastsIntoDrawer(page, [
      first.id,
      second.id
    ]);
    const count = raised.getByTestId("top-bar-toast-count");

    await tabUntilFocused(page, count);
    await expect(count).toBeFocused();
    await page.mouse.move(10, 600);
    await page.keyboard.press("Enter");
    const list = raised.getByTestId("top-bar-toast-list");
    await expect(list).toBeVisible();
    await expect(raised.getByTestId("top-bar-toast-dismiss")).toHaveCSS(
      "opacity",
      "1"
    );

    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Space");
    await expect(list).toBeVisible();
    const rowDismiss = list
      .getByRole("button", { name: "Dismiss notification" })
      .first();
    await tabUntilFocused(page, rowDismiss, 10);
    await expect(rowDismiss).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(list).toBeHidden();
    await expect(raised.getByTestId("top-bar-toast-count")).toBeHidden();
    await expect(raised.getByTestId("top-bar-toast-latest")).toContainText(
      /link copied/i
    );
    await expect(drawer).toBeVisible();
  });

  test("the raised toast list stays on screen beside the Appearance drawer", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 800 });
    await ensureInAppOnHome(page);

    const first = await e2eSeed.memory.node({
      label: `E2E toast bounds first ${Date.now()}`
    });
    const second = await e2eSeed.memory.node({
      label: `E2E toast bounds second ${Date.now()}`
    });
    await openNodesLibrary(page);
    const list = await openRaisedListBesideDrawer(page, [first.id, second.id]);
    await page.setViewportSize({ width: 801, height: 600 });
    await expect(list).toBeVisible();
    await expectListBesideDrawer(page, list);

    await page.setViewportSize({ width: 2200, height: 1100 });
    await expect(list).toBeVisible();
    await expectListBesideDrawer(page, list);
  });

  test("the raised toast list stays on screen beside the drawer in a framed app style", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 800 });
    await ensureInAppOnHome(page);

    await openSettings(page);
    const drawer = await openAppearanceDrawer(page);
    const originalStyle = await drawer
      .locator('[data-app-style-option][aria-pressed="true"]')
      .getAttribute("data-app-style-option");
    expect(originalStyle).toBeTruthy();
    await selectAppStyle(page, "rounded");
    try {
      await expect(page.locator('[data-app-style="rounded"]')).not.toHaveCount(
        0
      );
      await expect(async () => {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("settings-sidebar")).toBeHidden({
          timeout: 1_000
        });
      }, "Escape closes the drawer and Settings").toPass({ timeout: 10_000 });

      const first = await e2eSeed.memory.node({
        label: `E2E toast framed first ${Date.now()}`
      });
      const second = await e2eSeed.memory.node({
        label: `E2E toast framed second ${Date.now()}`
      });
      await openNodesLibrary(page);
      const list = await openRaisedListBesideDrawer(page, [
        first.id,
        second.id
      ]);
      await page.setViewportSize({ width: 801, height: 600 });
      await expect(list).toBeVisible();
      await expectListBesideDrawer(page, list);
    } finally {
      await page.setViewportSize({ width: 1024, height: 800 });
      await selectAppStyle(page, originalStyle!);
    }
  });
});

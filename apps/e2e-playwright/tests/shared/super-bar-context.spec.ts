import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

test.describe("super bar context and modes", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("shows the resource as a pill, drops it on Backspace, filters commands with > and closes on Escape", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E super bar ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByTestId("command-bar-input");
    await expect(input).toBeFocused();
    await expect(page.getByTestId("super-bar-context-pill")).toContainText(
      "This node"
    );
    await expect(page.getByTestId("super-bar-group-context")).toBeVisible();

    await input.press("Backspace");
    await expect(page.getByTestId("super-bar-context-pill")).toHaveCount(0);
    await expect(page.getByTestId("super-bar-group-context")).toHaveCount(0);
    await expect(input).toBeVisible();

    await input.pressSequentially(">set");
    await expect(page.getByTestId("super-bar-mode-chip")).toBeVisible();
    await expect(input).toHaveValue("set");
    await expect(page.getByTestId("super-bar-group-command")).toBeVisible();
    await expect(page.getByTestId("super-bar-group-result")).toHaveCount(0);

    await input.press("Escape");
    await expect(input).toBeHidden();
  });
});

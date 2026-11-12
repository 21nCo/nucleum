import { expect, test } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";

test.describe("global chords", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("G then a letter opens global destinations and a lone letter does nothing", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("g");
    await page.keyboard.press("l");
    await expect(page).toHaveURL(/\/library(\/|$|\?)/, { timeout: 10_000 });

    await page.keyboard.press("g");
    await page.keyboard.press("c");
    await expect(page).toHaveURL(/\/calendar(\/|$|\?)/, { timeout: 10_000 });

    await page.keyboard.press("l");
    await expect(page).toHaveURL(/\/calendar(\/|$|\?)/);
  });

  test("question mark opens the hot key sheet listing the chords", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("Shift+?");
    await expect(
      page.getByText("Hot key shortcuts", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("G C", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Pinned space 1 to 9", { exact: true }).first()
    ).toBeVisible();
  });
});

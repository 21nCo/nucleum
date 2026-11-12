import { expect, test } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";
import { openSettings } from "../utils/settings";

test.describe("list view keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("Option arrows up and down step the Library types in the side panel", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Nucleum shows Library types in the side panel"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/library/collection/all");
    await expect(
      page.getByRole("button", { name: "Simple" }).first()
    ).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("Alt+ArrowDown");
    await expect(page).not.toHaveURL(/\/library\/collection\//);
    await page.keyboard.press("Alt+ArrowUp");
    await expect(page).toHaveURL(/\/library\/collection\//);
  });

  test("Option arrows up and down step the settings list while Settings is open", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await openSettings(page);
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    const setting = () => new URL(page.url()).searchParams.get("setting");
    await page.keyboard.press("Alt+ArrowDown");
    await expect
      .poll(setting, { message: "first setting selected" })
      .not.toBeNull();
    const first = setting();
    await page.keyboard.press("Alt+ArrowDown");
    await expect
      .poll(setting, { message: "next setting selected" })
      .not.toBe(first);
    await page.keyboard.press("Alt+ArrowUp");
    await expect
      .poll(setting, { message: "back to the first setting" })
      .toBe(first);
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
  });
});

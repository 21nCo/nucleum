import { expect, test } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";

test.describe("sub view keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("Option+Shift arrows step the Classic calendar scale", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "The Classic calendar scale switcher is a Nucleum surface here"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/calendar/classic/year");
    await expect(page).toHaveURL(/\/calendar\/classic\/year/, {
      timeout: 15_000
    });
    await expect(
      page.getByRole("button", { name: "Year" }).first()
    ).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("Alt+Shift+ArrowLeft");
    await expect(page).toHaveURL(/\/calendar\/classic\/month/);
    await page.keyboard.press("Alt+Shift+ArrowRight");
    await expect(page).toHaveURL(/\/calendar\/classic\/year/);
  });

  test("Option+Shift arrows step the Library sub types", async ({ page }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Library collections are a Nucleum surface here"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/library/collection/all");
    await expect(page).toHaveURL(/\/library\/collection\/all/, {
      timeout: 15_000
    });
    await expect(
      page.getByRole("button", { name: "Simple" }).first()
    ).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("Alt+Shift+ArrowRight");
    await expect(page).not.toHaveURL(/\/library\/collection\/all/);
    await page.keyboard.press("Alt+Shift+ArrowLeft");
    await expect(page).toHaveURL(/\/library\/collection\/all/);
  });
});

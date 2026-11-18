import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { ensureInAppOnHome } from "../utils/helpers";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

const datafnStorePath = resolveRepoFsImportPath(
  "client/datafn/datafn.store.ts"
);

/**
 * Whether the app server serves repo source modules, as the Vite dev server
 * does; a static build answers those imports with HTML.
 */
async function isRepoSourceServed(page: Page) {
  const response = await page.request.get(datafnStorePath);
  return (
    response.ok() && /javascript/.test(response.headers()["content-type"] ?? "")
  );
}

/** Reads a note's starred state from the app's datafn store. */
async function readIsStarred(page: Page, id: string) {
  return page.evaluate(
    async ({ datafnStorePath, id }) => {
      const { datafn } = await import(datafnStorePath);
      const result = await datafn.node.query({ filters: { id } });
      return Boolean(result.data?.[0]?.isStarred);
    },
    { id, datafnStorePath }
  );
}

test.describe("page letters", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("S stars the open resource and the menu shows the letters", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "The starred state is read through repo source modules, which only the Vite dev server serves"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E page letters ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    const star = page.locator(".popover [data-context-menu-item-id='star']");
    const openMenu = async () => {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await menuTrigger.click();
      await expect(star.first()).toBeVisible({ timeout: 10_000 });
    };
    const closeMenu = async () => {
      await page.keyboard.press("Escape");
      await expect(star.first()).toBeHidden({ timeout: 10_000 });
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
    };

    await openMenu();
    await expect(
      star.first().getByTestId("context-menu-item-hotkey")
    ).toHaveText("S");
    await expect(star.first()).not.toContainText("Starred");
    await closeMenu();

    await page.keyboard.press("s");
    await openMenu();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenu();
    await expect
      .poll(() => readIsStarred(page, node.id), {
        message: "S stars the open note in the datafn store",
        timeout: 10_000
      })
      .toBe(true);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodeRecordFromLibraryById(page, node.id);
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await openMenu();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenu();

    await page.keyboard.press("s");
    await openMenu();
    await expect(star.first()).not.toContainText("Starred", {
      timeout: 10_000
    });
    await closeMenu();
    await expect
      .poll(() => readIsStarred(page, node.id), {
        message: "S again unstars the open note in the datafn store",
        timeout: 10_000
      })
      .toBe(false);
  });

  test("calendar letters switch the scale and Shift+T goes to today", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "The classic calendar scale letters are checked on Nucleum"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/calendar/classic/week");
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("m");
    await expect(page).toHaveURL(/\/calendar\/classic\/month/);
    const thisMonth = (await controls.innerText()).match(
      /[A-Z][a-z]{2,} \d{4}/
    )?.[0];
    await page.getByRole("button", { name: "Next calendar period" }).click();
    await expect(controls).not.toContainText(thisMonth ?? "");
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Shift+T");
    await expect(controls).toContainText(thisMonth ?? "");

    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/calendar\/classic\/day/);
  });
});

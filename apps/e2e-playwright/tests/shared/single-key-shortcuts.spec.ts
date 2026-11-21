import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { browserShortcutModifier, ensureInAppOnHome } from "../utils/helpers";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import { openSettings } from "../utils/settings";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

const datafnStorePath = resolveRepoFsImportPath(
  "client/datafn/datafn.store.ts"
);
const userPreferencesStorePath = resolveRepoFsImportPath(
  "client/shared-state/preferences/user-preferences.store.ts"
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

/** Turns single-key shortcuts back on, so later tests see the default. */
async function restoreSingleKeyShortcuts(page: Page) {
  await page
    .evaluate(async (storePath) => {
      const { userPreferences } = await import(storePath);
      await userPreferences.setSingleKeyShortcutsEnabled(true);
    }, userPreferencesStorePath)
    .catch(() => null);
}

async function blurActiveElement(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
}

/** Opens Shortcuts settings and returns the Single-key shortcuts switch. */
async function openSingleKeySwitch(page: Page) {
  await openSettings(page);
  await page
    .getByTestId("settings-sidebar")
    .getByRole("button", { name: /^Keyboard shortcuts$/i })
    .click({ noWaitAfter: true, timeout: 5_000 });
  const panel = page.getByTestId("keyboard-shortcut-settings");
  await expect(panel).toBeVisible({ timeout: 10_000 });
  const container = panel.getByTestId("toggle-single-key-shortcuts");
  await expect(container).toBeVisible({ timeout: 10_000 });
  await expect(container).toContainText("Single-key shortcuts");
  return container.locator('input[type="checkbox"]');
}

async function closeSettings(page: Page) {
  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByTestId("keyboard-shortcut-settings")).toBeHidden({
    timeout: 10_000
  });
  await blurActiveElement(page);
}

test.describe("single-key shortcuts setting", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("turning it off stops letters, chords and hints; Cmd+K still works", async ({
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
    test.setTimeout(150_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E single-key shortcuts ${Date.now()}`
    });

    try {
      const toggle = await openSingleKeySwitch(page);
      await expect(toggle).toBeChecked();
      await toggle.click({ force: true });
      await expect(toggle).not.toBeChecked({ timeout: 5_000 });
      await closeSettings(page);

      await openNodeRecordFromLibraryById(page, node.id);
      const menuTrigger = page.getByTestId("resource-record-context-menu");
      await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
      const noteUrl = page.url();
      const star = page.locator(".popover [data-context-menu-item-id='star']");
      const openMenu = async () => {
        await blurActiveElement(page);
        await menuTrigger.click();
        await expect(star.first()).toBeVisible({ timeout: 10_000 });
      };
      const closeMenu = async () => {
        await page.keyboard.press("Escape");
        await expect(star.first()).toBeHidden({ timeout: 10_000 });
        await blurActiveElement(page);
      };

      await blurActiveElement(page);
      await page.keyboard.press("s");
      await page.keyboard.press("g");
      await page.keyboard.press("c");
      await page.keyboard.press("/");

      await openMenu();
      await expect(star.first()).not.toContainText("Starred");
      await expect(
        page.locator(".popover").getByTestId("context-menu-item-hotkey")
      ).toHaveCount(0);
      await closeMenu();
      expect(await readIsStarred(page, node.id)).toBe(false);
      expect(page.url()).toBe(noteUrl);
      await expect(page).not.toHaveURL(/\/calendar(\/|$|\?)/);
      await expect(page).not.toHaveURL(/navigator/);

      await page.keyboard.press(`${await browserShortcutModifier(page)}+k`);
      await expect(page.getByTestId("command-bar-input")).toBeFocused({
        timeout: 10_000
      });
      await expect(page.getByTestId("super-bar-group-context")).toBeVisible();
      await expect(page.getByTestId("super-bar-context-hotkey")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("command-bar-input")).toBeHidden({
        timeout: 10_000
      });

      await page.reload();
      await ensureInAppOnHome(page);
      const toggleAfterReload = await openSingleKeySwitch(page);
      await expect(toggleAfterReload).not.toBeChecked({ timeout: 10_000 });

      await toggleAfterReload.click({ force: true });
      await expect(toggleAfterReload).toBeChecked({ timeout: 5_000 });
      await closeSettings(page);

      await openNodeRecordFromLibraryById(page, node.id);
      await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
      await blurActiveElement(page);
      await page.keyboard.press("s");
      await expect
        .poll(() => readIsStarred(page, node.id), {
          message: "S stars the open note once single-key shortcuts are on",
          timeout: 10_000
        })
        .toBe(true);
      await openMenu();
      await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
      await expect(
        page
          .locator(".popover [data-context-menu-item-id='star']")
          .first()
          .getByTestId("context-menu-item-hotkey")
      ).toHaveText("S");
      await closeMenu();
    } finally {
      await restoreSingleKeyShortcuts(page);
    }
  });
});

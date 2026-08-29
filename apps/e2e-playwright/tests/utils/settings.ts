import { expect, type Page } from "@playwright/test";
import { runCommand } from "./helpers";
import {
  expectAnyLocatorVisible,
  getAnyVisibleLocator
} from "./locator-assertions";

export async function assertSettingsShellVisible(page: Page) {
  const sidebar = page.getByTestId("settings-sidebar");
  const modalClose = page.getByTestId("modal-close");
  const title = page.getByText("Settings", { exact: true }).first();

  await expectAnyLocatorVisible([sidebar, modalClose, title], {
    message: "settings shell exposes a visible semantic anchor",
    timeout: 12_000
  });
}

export async function assertSearchOrCommandBarInputVisible(page: Page) {
  const cmd = page.getByTestId("command-bar-input");
  const searchByTestId = page.locator('[data-testid^="search-"]').first();
  const placeholder = page.getByPlaceholder(
    /Start typing to search|Type here to search|Search/i
  );
  const searchRole = page.getByRole("search");

  const searchInputs = [
    searchByTestId,
    placeholder.first(),
    searchRole.first().getByRole("textbox").first()
  ];
  const focusedSearchInput = getAnyVisibleLocator(
    searchInputs.map((locator) => locator.and(page.locator(":focus")))
  );
  await expect(async () => {
    if (await cmd.isVisible().catch(() => false)) {
      await expect(cmd).toBeVisible({ timeout: 500 });
      return;
    }
    await expect(focusedSearchInput).toBeVisible({ timeout: 500 });
  }, "command bar or focused search input is visible").toPass({
    timeout: 15_000
  });
}

export async function openSettings(page: Page) {
  const overlay = page.locator("#cp");
  if (await overlay.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => null);
    const closed = await overlay
      .waitFor({ state: "hidden", timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (!closed) {
      await page.keyboard.press("Escape").catch(() => null);
      await expect(overlay).toBeHidden({ timeout: 5_000 });
    }
  }

  const profileBtn = page.getByTestId("topnav-account-settings");
  const profileVisible = await profileBtn.isVisible().catch(() => false);
  if (profileVisible) {
    await profileBtn.click({ timeout: 8_000, force: true }).catch(() => null);
    const opened = await expectAnyLocatorVisible(
      [page.getByTestId("settings-sidebar"), page.getByTestId("modal-close")],
      {
        message: "account settings action opens the settings shell",
        timeout: 4_000
      }
    )
      .then(() => true)
      .catch(() => false);
    if (opened) {
      await assertSettingsShellVisible(page);
      return;
    }
  }

  const settingsIconBtn = page
    .getByRole("button", { name: /^Settings$/i })
    .first();
  const iconVisible = await settingsIconBtn.isVisible().catch(() => false);
  if (iconVisible) {
    await settingsIconBtn.click({ timeout: 5_000 }).catch(() => null);
    const opened = await expectAnyLocatorVisible(
      [page.getByTestId("settings-sidebar"), page.getByTestId("modal-close")],
      {
        message: "settings button opens the settings shell",
        timeout: 4_000
      }
    )
      .then(() => true)
      .catch(() => false);
    if (opened) {
      await assertSettingsShellVisible(page);
      return;
    }
  }

  await runCommand(page, "Settings");
  await assertSettingsShellVisible(page);
}

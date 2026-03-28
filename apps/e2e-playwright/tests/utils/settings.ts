import { expect, type Page } from "@playwright/test";
import { runCommand } from "./helpers";

export async function assertSettingsShellVisible(page: Page) {
  const sidebar = page.getByTestId("settings-sidebar");
  const modalClose = page.getByTestId("modal-close");
  const title = page.getByText("Settings", { exact: true }).first();

  await expect
    .poll(
      async () => {
        if (await sidebar.isVisible().catch(() => false)) return true;
        if (await modalClose.isVisible().catch(() => false)) return true;
        if (await title.isVisible().catch(() => false)) return true;
        return false;
      },
      { timeout: 12_000 }
    )
    .toBe(true);
}

export async function settingsModalLikelyOpen(page: Page) {
  return (
    (await page
      .getByTestId("settings-sidebar")
      .isVisible()
      .catch(() => false)) ||
    (await page
      .getByTestId("modal-close")
      .isVisible()
      .catch(() => false))
  );
}

export async function assertSearchOrCommandBarInputVisible(page: Page) {
  const cmd = page.getByTestId("command-bar-input");
  const placeholder = page.getByPlaceholder(
    /Start typing to search|Type here to search|Search/i
  );
  const searchRole = page.getByRole("search");

  await expect
    .poll(
      async () => {
        if (await cmd.isVisible().catch(() => false)) return true;
        if (await placeholder.isVisible().catch(() => false)) return true;
        if (
          await searchRole
            .first()
            .isVisible()
            .catch(() => false)
        )
          return true;
        if (
          await page
            .getByRole("textbox")
            .first()
            .isVisible()
            .catch(() => false)
        )
          return true;
        return false;
      },
      { timeout: 15_000 }
    )
    .toBe(true);
}

export async function openSettings(page: Page) {
  const overlay = page.locator("#cp");
  if (await overlay.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(250);
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(250);
  }

  const profileBtn = page.getByTestId("topnav-account-settings");
  const profileVisible = await profileBtn.isVisible().catch(() => false);
  if (profileVisible) {
    await profileBtn.click({ timeout: 8_000, force: true }).catch(() => null);
    if (await settingsModalLikelyOpen(page)) {
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
    if (await settingsModalLikelyOpen(page)) {
      await assertSettingsShellVisible(page);
      return;
    }
  }

  await runCommand(page, "Settings");
  await assertSettingsShellVisible(page);
}

import { test, expect, type Page } from "@playwright/test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { openSettings } from "../../utils/settings";

async function openAppearanceProfiles(page: Page) {
  await openSettings(page);
  await page
    .getByTestId("settings-sidebar")
    .getByRole("button", { name: /^Appearance$/i })
    .click({ timeout: 5_000 });
  const profiles = page.getByTestId("appearance-profiles");
  await expect(profiles).toBeVisible({ timeout: 10_000 });
  return profiles;
}

async function closeAppearance(page: Page) {
  await page.getByTestId("modal-close").first().click({ timeout: 5_000 });
  await expect(page.getByTestId("appearance-profiles")).toBeHidden({
    timeout: 5_000
  });
}

function appStyleOption(page: Page, style: string) {
  return page.locator(`[data-app-style-option="${style}"]`).first();
}

test.describe("settings - appearance profiles @settings", () => {
  test("save, modify, update, persist across reload, and delete a profile", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const name = `E2E profile ${Date.now()}`;

    let profiles = await openAppearanceProfiles(page);
    const originalStyle =
      (await page
        .locator('[data-testid="app-style-option"][aria-pressed="true"]')
        .first()
        .getAttribute("data-app-style-option")) ?? "boxed";
    const otherStyle = originalStyle === "rounded" ? "boxed" : "rounded";

    await profiles.getByTestId("appearance-profile-save-new").click();
    await page.getByTestId("appearance-profile-name").fill(name);
    await page.getByTestId("appearance-profile-name").press("Enter");
    const chip = profiles
      .getByTestId("appearance-profile-option")
      .filter({ hasText: name });
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(
      profiles.getByTestId("appearance-profile-modified")
    ).toBeHidden();

    await appStyleOption(page, otherStyle).click();
    await expect(
      profiles.getByTestId("appearance-profile-modified")
    ).toBeVisible();

    await profiles.getByTestId("appearance-profile-update").click();
    await expect(
      profiles.getByTestId("appearance-profile-modified")
    ).toBeHidden();

    await closeAppearance(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);

    profiles = await openAppearanceProfiles(page);
    const reloadedChip = profiles
      .getByTestId("appearance-profile-option")
      .filter({ hasText: name });
    await expect(reloadedChip).toHaveAttribute("aria-pressed", "true");
    await expect(
      profiles.getByTestId("appearance-profile-modified")
    ).toBeHidden();
    await expect(appStyleOption(page, otherStyle)).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await profiles
      .locator(`[data-profile-id]`)
      .filter({ hasText: name })
      .locator("..")
      .getByTestId("appearance-profile-menu")
      .click();
    await page.locator('[data-context-menu-item-id="delete"]').click();
    await expect(reloadedChip).toHaveCount(0);
    await appStyleOption(page, originalStyle).click();
    await expect(appStyleOption(page, originalStyle)).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await closeAppearance(page);
  });
});

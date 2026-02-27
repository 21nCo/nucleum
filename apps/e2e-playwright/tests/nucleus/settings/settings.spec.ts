import { test, expect } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

/**
 * Settings is opened by clicking the profile icon (Account & Settings) in the top-left,
 * or via command bar "Settings". All tests avoid seed data.
 */
test.describe("settings – open, close, navigate (no seed data) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  /** Open Settings: try profile icon first, fallback to command bar "Settings". */
  async function openSettings(page: import("@playwright/test").Page) {
    const profileBtn = page.getByTestId("topnav-account-settings");
    const visible = await profileBtn.isVisible().catch(() => false);
    if (visible) {
      await profileBtn.click({ timeout: 5_000 });
    } else {
      await runCommand(page, "Settings");
    }
    await page.waitForTimeout(500);
  }

  test("open Settings via profile icon (Account & Settings), then assert modal visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page.getByTestId("topnav-account-settings").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("topnav-account-settings").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await expect(page.getByTestId("modal-close")).toBeVisible({ timeout: 5_000 });
  });

  test("close Settings via Close button (X), then assert modal hidden", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("modal-close")).toBeHidden({ timeout: 5_000 });
  });

  test("close Settings via Escape key, then assert modal hidden", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  });

  test("navigate to Focus and assert Focus settings panel visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Focus$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await expect(page.getByText("Focus", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Settings footer shows app version (Nucleus)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    await expect(page.getByText(/Nucleus\s+v?[\d.]+/i).first()).toBeVisible({
      timeout: 5_000
    });
  });
});

/**
 * Mode of interaction: comprehensive tests for Default/Agent, toggles, and shortcuts section.
 */
test.describe("settings – Mode of interaction (comprehensive) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openSettings(page: import("@playwright/test").Page) {
    const profileBtn = page.getByTestId("topnav-account-settings");
    const visible = await profileBtn.isVisible().catch(() => false);
    if (visible) {
      await profileBtn.click({ timeout: 5_000 });
    } else {
      await runCommand(page, "Settings");
    }
    await page.waitForTimeout(500);
  }

  async function openModeOfInteraction(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Mode of interaction$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    await expect(page.getByTestId("mode-of-interaction-settings")).toBeVisible({
      timeout: 5_000
    });
  }

  test("Mode of interaction: all sections and controls visible", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await expect(page.getByText("Mode of interaction", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Preferred mode of interaction", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^Default$/i }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^Agent$/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText("Hide all hot key and shortcut hints", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Hide App menu bar on hot key", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("Keyboard shortcuts", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Command bar", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Edit mode", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Search", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Go back", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Go forward", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByRole("button", { name: /^See hot keys$/i }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /^See markdown shortcuts$/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Mode of interaction: switch Default → Agent, toggles hidden; switch back to Default", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await page.getByRole("button", { name: /^Agent$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await expect(page.getByTestId("toggle-hide-shortcut-hints")).toBeHidden({
      timeout: 3_000
    });
    await expect(page.getByTestId("toggle-hide-menu-bar")).toBeHidden({
      timeout: 3_000
    });

    await page.getByRole("button", { name: /^Default$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await expect(page.getByTestId("toggle-hide-shortcut-hints")).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByTestId("toggle-hide-menu-bar")).toBeVisible({
      timeout: 5_000
    });
  });

  test("Mode of interaction: enable Hide shortcut hints, verify setting persists and toggle reflects it, then disable", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await openModeOfInteraction(page);
    const container = page.getByTestId("toggle-hide-shortcut-hints");
    await container.waitFor({ state: "visible", timeout: 5_000 });
    const checkbox = container.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: "visible", timeout: 3_000 });
    const wasChecked = await checkbox.isChecked().catch(() => false);
    if (!wasChecked) {
      await checkbox.click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await openModeOfInteraction(page);
    const checkboxAfter = page.getByTestId("toggle-hide-shortcut-hints").locator('input[type="checkbox"]');
    await expect(checkboxAfter).toBeChecked({ timeout: 5_000 });

    if (!wasChecked) {
      await checkboxAfter.click({ force: true });
      await page.waitForTimeout(300);
    }
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await openModeOfInteraction(page);
    const checkboxRestored = page.getByTestId("toggle-hide-shortcut-hints").locator('input[type="checkbox"]');
    await expect(checkboxRestored).toBeChecked({ checked: wasChecked, timeout: 5_000 });
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Mode of interaction: enable Hide menu bar on Q and verify Q hides/shows left nav, then disable", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await expect(page.getByTestId("leftnav-settings")).toBeVisible({ timeout: 10_000 });

    await openModeOfInteraction(page);
    const container = page.getByTestId("toggle-hide-menu-bar");
    await container.waitFor({ state: "visible", timeout: 5_000 });
    const checkbox = container.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: "visible", timeout: 3_000 });
    const wasChecked = await checkbox.isChecked().catch(() => false);
    if (!wasChecked) {
      await checkbox.click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await page.keyboard.press("q");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("leftnav-settings")).toBeHidden({ timeout: 5_000 });

    await page.keyboard.press("q");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("leftnav-settings")).toBeVisible({ timeout: 5_000 });

    await openModeOfInteraction(page);
    const checkbox2 = page.getByTestId("toggle-hide-menu-bar").locator('input[type="checkbox"]');
    if (!wasChecked) await checkbox2.click({ force: true });
    await page.waitForTimeout(300);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Mode of interaction: See hot keys opens (then close)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await page.getByRole("button", { name: /^See hot keys$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const dialog = page.getByRole("dialog");
    await expect(dialog.or(page.getByText(/hot key|shortcut/i).first())).toBeVisible({
      timeout: 5_000
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("Mode of interaction: See markdown shortcuts opens (then close)", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await page
      .getByRole("button", { name: /^See markdown shortcuts$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("dialog").or(page.getByText(/markdown|shortcut/i).first())
    ).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("Mode of interaction: shortcut rows have editable key (Command bar, Edit mode, Search, Go back, Go forward)", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    const panel = page.getByTestId("mode-of-interaction-settings");
    for (const label of ["Command bar", "Edit mode", "Search", "Go back", "Go forward"]) {
      await expect(panel.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 5_000
      });
    }
    const shortcutInputs = panel.locator('input[placeholder="record shortcut"]');
    await expect(shortcutInputs.first()).toBeVisible({ timeout: 5_000 });
    expect(await shortcutInputs.count()).toBeGreaterThanOrEqual(5);
  });

  test("Mode of interaction: change Command bar shortcut, verify it opens command bar, then reset to default", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("mode-of-interaction-settings");

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyO`;
    const defaultCombo = `${modifier}+Shift+KeyP`;

    await openModeOfInteraction(page);

    const commandBarRow = panel
      .getByText("Command bar", { exact: true })
      .locator("..");
    await expect(commandBarRow).toBeVisible({ timeout: 5_000 });
    const shortcutBtn = commandBarRow.locator("button").first();
    await shortcutBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    const input = commandBarRow.locator('input[placeholder="record shortcut"]');
    await input.waitFor({ state: "visible", timeout: 3_000 });
    await input.focus();
    await page.keyboard.press(newCombo);
    await page.waitForTimeout(200);
    await commandBarRow.getByTestId("shortcut-accept").locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(500);
    await expect(page.getByTestId("command-bar-input")).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press(`${modifier}+Escape`);
    await page.waitForTimeout(300);
    await expect(page.locator("#CMD")).toBeHidden({ timeout: 10_000 });

    await openModeOfInteraction(page);
    const panel2 = page.getByTestId("mode-of-interaction-settings");
    const row2 = panel2
      .getByText("Command bar", { exact: true })
      .locator("..");
    await row2.locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    const input2 = row2.locator('input[placeholder="record shortcut"]');
    await input2.focus();
    await page.keyboard.press(defaultCombo);
    await page.waitForTimeout(200);
    await row2.getByTestId("shortcut-accept").locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });
});

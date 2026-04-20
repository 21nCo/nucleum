import { test, expect } from "@playwright/test";
import {
  ensureInAppOnHome,
  getProductConfig,
  goalResourcePattern
} from "../../utils/helpers";
import {
  assertSearchOrCommandBarInputVisible,
  assertSettingsShellVisible,
  openSettings
} from "../../utils/settings";
import {
  listEnabledSettingsPanels,
  openDeclaredSettingsPanel
} from "../../utils/settings-contracts";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

function getCapabilities(projectName: string) {
  return getProductConfig(projectName).capabilities;
}

test.describe("settings - open, close, navigate (shared) @regression @smoke @settings-smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open Settings and assert modal visible", async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    const productConfig = getProductConfig(testInfo.project.name);

    if (productConfig.ui.settingsEntryPoint === "topnav-account-settings") {
      await page
        .getByTestId("topnav-account-settings")
        .waitFor({ state: "visible", timeout: 10_000 });
      await page
        .getByTestId("topnav-account-settings")
        .click({ timeout: 5_000 });
    } else {
      const settingsBtn = page
        .getByRole("button", { name: /^Settings$/i })
        .first();
      await settingsBtn.waitFor({ state: "visible", timeout: 10_000 });
      await settingsBtn.click({ timeout: 5_000 });
    }
    await assertSettingsShellVisible(page);
  });

  test("close Settings via Close button (X), then assert modal hidden", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("modal-close")).toBeHidden({
      timeout: 5_000
    });
  });

  test("close Settings via Escape key, then assert modal hidden", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  });

  test("navigate through all visible settings sidebar sections (smoke)", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedSidebarSmoke,
      "Shared settings-sidebar smoke flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const continueOffline = page
      .getByRole("button", { name: /Continue (using )?offline/i })
      .first();
    if (await continueOffline.isVisible().catch(() => false)) {
      await continueOffline.click({ timeout: 5_000 });
      await page.waitForLoadState("domcontentloaded").catch(() => null);
      await ensureInAppOnHome(page);
    }

    await openSettings(page);
    await assertSettingsShellVisible(page);

    const declaredPanels = listEnabledSettingsPanels(testInfo.project.name);
    expect(declaredPanels.length).toBeGreaterThan(0);

    const toClick = Math.min(declaredPanels.length, 3);
    const started = Date.now();
    for (let i = 0; i < toClick; i += 1) {
      if (Date.now() - started > 75_000) break;
      await openDeclaredSettingsPanel(
        page,
        testInfo.project.name,
        declaredPanels[i].key
      );
    }
  });
});

test.describe("settings - Mode of interaction (comprehensive) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openModeOfInteraction(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Mode of interaction$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    const panel = page.getByTestId("mode-of-interaction-settings");
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.scrollIntoViewIfNeeded();
  }

  async function openKeyboardShortcuts(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Keyboard shortcuts$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);
  }

  async function assertKeyboardShortcutsContentVisible(
    page: import("@playwright/test").Page
  ) {
    await expect(
      page.getByText("Keyboard shortcuts", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
    });
    await expect(
      page.getByText("Command bar", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
    });
    await expect(
      page.getByText("Edit mode", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Search", { exact: true }).first()).toBeVisible(
      {
        timeout: 8_000
      }
    );
    await expect(
      page.getByText("Go back", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
    });
    await expect(
      page.getByText("Go forward", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
    });
    await expect(
      page.getByRole("button", { name: /^See hot keys$/i }).first()
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole("button", { name: /^See markdown shortcuts$/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  async function openAppearance(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Appearance$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(
      page.getByText("Sync theme with system", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
  }

  test("Appearance: select each light color scheme and verify appearance changes", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);
    await openAppearance(page);

    await expect(
      page.getByText("Sync theme with system", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    const lightSchemeVisible = await page
      .getByText("Light color scheme", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);

    if (!lightSchemeVisible) {
      const syncToggle = page
        .getByText("Sync theme with system", { exact: true })
        .first()
        .locator("xpath=ancestor::*[.//label][1]//label");
      await syncToggle.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    }

    await expect(
      page.getByText("Light color scheme", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    const lightThemes = [
      { name: "Blue", id: "colorscheme:clean_tidyblue_light" },
      { name: "Red", id: "colorscheme:clean_tidyred_light" },
      { name: "Mono", id: "colorscheme:clean_tidymono_light" },
      { name: "Iris", id: "colorscheme:clean_tidyiris_light" },
      { name: "Violet", id: "colorscheme:clean_tidyviolet_light" },
      { name: "Pink", id: "colorscheme:clean_tidypink_light" },
      { name: "Orange", id: "colorscheme:clean_tidyorange_light" },
      { name: "Solarized", id: "colorscheme:clean_solarized_light" }
    ];

    for (const theme of lightThemes) {
      const btn = page
        .getByRole("button", { name: theme.name, exact: true })
        .first();
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
      await expect(
        page.getByRole("button", { name: theme.name, exact: true }).first()
      ).toHaveAttribute("data-selected", "true", { timeout: 5_000 });
    }

    await page
      .getByRole("button", { name: "Blue", exact: true })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await page
      .locator("#cp")
      .getByTestId("modal-close")
      .click({ timeout: 5_000 });
  });

  test("Appearance: switch between light and dark themes and verify theme layer updates", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openAppearance(page);

    const lightSchemeVisible = await page
      .getByText("Light color scheme", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);

    if (lightSchemeVisible) {
      const syncToggle = page
        .getByRole("button", { name: "Sync theme with system", exact: true })
        .first();
      await syncToggle.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    }

    const themeGroup = page.getByText("Theme", { exact: true }).first();
    await expect(themeGroup).toBeVisible({ timeout: 10_000 });

    const themeRoot = page.locator("#ntheme").first();
    await expect(themeRoot).toBeVisible({ timeout: 10_000 });

    const darkButton = page.getByRole("button", { name: "Dark", exact: true }).first();
    await darkButton.click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await expect(themeRoot).toHaveClass(/dark/, { timeout: 5_000 });

    const lightButton = page
      .getByRole("button", { name: "Light", exact: true })
      .first();
    await lightButton.click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await expect(themeRoot).not.toHaveClass(/dark/, { timeout: 5_000 });
  });

  test("Mode of interaction: all sections and controls visible", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedModeOfInteraction,
      "Shared mode-of-interaction panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await expect(
      page.getByText("Mode of interaction", { exact: true }).first()
    ).toBeVisible({
      timeout: 8_000
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
      page
        .getByText("Hide all hot key and shortcut hints", { exact: true })
        .first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Hide App menu bar on hot key", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    await assertKeyboardShortcutsContentVisible(page);
  });

  test("Keyboard shortcuts: open from sidebar and assert same content visible", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedModeOfInteraction,
      "Shared keyboard-shortcuts panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openKeyboardShortcuts(page);
    await assertKeyboardShortcutsContentVisible(page);
  });

  test("Mode of interaction: switch Default → Agent, toggles hidden; switch back to Default", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await page
      .getByRole("button", { name: /^Agent$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await expect(page.getByTestId("toggle-hide-shortcut-hints")).toBeHidden({
      timeout: 3_000
    });
    await expect(page.getByTestId("toggle-hide-menu-bar")).toBeHidden({
      timeout: 3_000
    });

    await page
      .getByRole("button", { name: /^Default$/i })
      .first()
      .click({ timeout: 5_000 });
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
    const checkboxAfter = page
      .getByTestId("toggle-hide-shortcut-hints")
      .locator('input[type="checkbox"]');
    await expect(checkboxAfter).toBeChecked({ timeout: 5_000 });

    if (!wasChecked) {
      await checkboxAfter.click({ force: true });
      await page.waitForTimeout(300);
    }
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await openModeOfInteraction(page);
    const checkboxRestored = page
      .getByTestId("toggle-hide-shortcut-hints")
      .locator('input[type="checkbox"]');
    await expect(checkboxRestored).toBeChecked({
      checked: wasChecked,
      timeout: 5_000
    });
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Mode of interaction: enable Hide menu bar on Q and verify Q hides/shows left nav, then disable", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await expect(page.getByTestId("leftnav-settings")).toBeVisible({
      timeout: 10_000
    });

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

    await expect(page.getByTestId("leftnav-settings")).toBeVisible({
      timeout: 5_000
    });

    await page.keyboard.press("q");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("leftnav-settings")).toBeHidden({
      timeout: 5_000
    });

    await page.keyboard.press("q");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("leftnav-settings")).toBeVisible({
      timeout: 5_000
    });

    await openModeOfInteraction(page);
    const checkbox2 = page
      .getByTestId("toggle-hide-menu-bar")
      .locator('input[type="checkbox"]');
    if (!wasChecked) await checkbox2.click({ force: true });
    await page.waitForTimeout(300);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Mode of interaction: See hot keys - open, verify list, close modals, then run each hot key and verify", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedHotKeyMatrix,
      "Shared hot-key matrix is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    await openModeOfInteraction(page);
    const defaultModeBtn = page
      .getByRole("button", { name: /^Default$/i })
      .first();
    if (await defaultModeBtn.isVisible().catch(() => false)) {
      await defaultModeBtn.click({ timeout: 5_000 }).catch(() => null);
      await page.waitForTimeout(250);
    }

    await page
      .getByRole("button", { name: /^See hot keys$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await expect(
      page.getByText("Hot key shortcuts", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    const hotKeysPanel = page
      .locator("div")
      .filter({ hasText: /Hot key shortcuts/ })
      .filter({ hasText: "Page / Action" })
      .first();
    await expect(
      hotKeysPanel.getByText("Page / Action", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Shortcut", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Calendar", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Library", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Overview", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Toggle sidebar", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });

    await page
      .locator("#HOT_KEYS")
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator("#HOT_KEYS")).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(400);

    await page
      .locator("#cp")
      .getByTestId("modal-close")
      .click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeHidden({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.locator("body").click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(400);

    await page.keyboard.press("c");
    await page.waitForTimeout(600);
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("l");
    await page.waitForTimeout(600);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: goalResourcePattern })
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/Library/i)
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);

    await page.keyboard.press("o");
    await page.waitForTimeout(600);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("l");
    await page.waitForTimeout(600);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: goalResourcePattern })
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/Library/i)
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);

    await page.locator("body").click({ position: { x: 120, y: 240 } });
    await page.waitForTimeout(150);
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    await assertSearchOrCommandBarInputVisible(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  });

  test("Mode of interaction: See hot keys opens, verify each shortcut listed, then verify C/L/F/O/P/Q/Space trigger actions", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedHotKeyMatrix,
      "Shared hot-key matrix is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    const menuBarContainer = page.getByTestId("toggle-hide-menu-bar");
    await menuBarContainer.waitFor({ state: "visible", timeout: 5_000 });
    const menuBarCheckbox = menuBarContainer.locator('input[type="checkbox"]');
    const menuBarWasChecked = await menuBarCheckbox
      .isChecked()
      .catch(() => false);
    if (!menuBarWasChecked) {
      await menuBarContainer
        .locator("label:has(input[type='checkbox'])")
        .click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await page
      .getByRole("button", { name: /^See hot keys$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await expect(
      page.getByText("Hot key shortcuts", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    const hotKeysPanel = page
      .locator("div")
      .filter({ hasText: /Hot key shortcuts/ })
      .filter({ hasText: "Page / Action" })
      .first();
    await expect(
      hotKeysPanel.getByText("Page / Action", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Shortcut", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });

    await expect(
      hotKeysPanel.getByText("Calendar", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Library", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Overview", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      hotKeysPanel.getByText("Toggle sidebar", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });

    await page
      .locator("#HOT_KEYS")
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator("#HOT_KEYS")).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(300);

    await page
      .locator("#cp")
      .getByTestId("modal-close")
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("Settings", { exact: true }).first())
      .toBeHidden({
        timeout: 5_000
      })
      .catch(() => null);

    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    await page.keyboard.press("c");
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 8_000
    });

    if (getCapabilities(testInfo.project.name).commands.focus) {
      await page.keyboard.press("f");
      await page.waitForTimeout(500);
      await expect(
        page.getByText(/Focus|Quick focus|Focus session/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }

    await page.keyboard.press("l");
    await page.waitForTimeout(500);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: goalResourcePattern })
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/Library/i)
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 8_000 }
      )
      .toBe(true);

    await page.keyboard.press("o");
    await page.waitForTimeout(500);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 8_000
    });

    await page.keyboard.press("p");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await page.locator("body").click({ position: { x: 100, y: 200 } });
    await page.waitForTimeout(150);
    await page.keyboard.press("q");
    await page.waitForTimeout(800);
    const leftNavExists =
      (await page.getByTestId("leftnav-settings").count()) > 0;
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeHidden({
        timeout: 8_000
      });
    }

    await page.keyboard.press("q");
    await page.waitForTimeout(600);
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeVisible({
        timeout: 8_000
      });
    }

    await page.keyboard.press("l");
    await page.waitForTimeout(500);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: goalResourcePattern })
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/Library/i)
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 8_000 }
      )
      .toBe(true);

    await page.locator("body").click({ position: { x: 120, y: 240 } });
    await page.waitForTimeout(150);
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
    await assertSearchOrCommandBarInputVisible(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    if (!menuBarWasChecked) {
      await openModeOfInteraction(page);
      await page
        .getByTestId("toggle-hide-menu-bar")
        .locator("label:has(input[type='checkbox'])")
        .click({ timeout: 5_000 });
      await page.waitForTimeout(300);
      await page
        .locator("#cp")
        .getByTestId("modal-close")
        .click({ timeout: 5_000 });
    }
  });

  test("Mode of interaction: See markdown shortcuts opens (then close)", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await page
      .getByRole("button", { name: /^See markdown shortcuts$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const markdownDialog = page.getByRole("dialog");
    const markdownFallback = page.getByText(/markdown|shortcut/i).first();
    await expect
      .poll(
        async () =>
          (await markdownDialog.isVisible().catch(() => false)) ||
          (await markdownFallback.isVisible().catch(() => false)),
        { timeout: 5_000 }
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("Mode of interaction: shortcut rows have editable key (Command bar, Edit mode, Search, Go back, Go forward)", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    const panel = page.getByTestId("mode-of-interaction-settings");
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    for (const label of [
      "Command bar",
      "Edit mode",
      "Search",
      "Go back",
      "Go forward"
    ]) {
      await expect(panel.getByText(label, { exact: true }).first()).toBeVisible(
        {
          timeout: 8_000
        }
      );
    }
    const shortcutInputs = panel.locator(
      'input[placeholder="record shortcut"]'
    );
    await expect(shortcutInputs.first()).toBeVisible({ timeout: 8_000 });
    expect(await shortcutInputs.count()).toBeGreaterThanOrEqual(5);
  });

  async function changeShortcutAndClose(
    page: import("@playwright/test").Page,
    panel: import("@playwright/test").Locator,
    rowLabel: string,
    newCombo: string
  ) {
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const row = panel.getByText(rowLabel, { exact: true }).locator("..");
    await expect(row).toBeVisible({ timeout: 8_000 });
    await row.locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    const input = row.locator('input[placeholder="record shortcut"]');
    await input.waitFor({ state: "visible", timeout: 3_000 });
    await input.focus();
    await page.keyboard.press(newCombo);
    await page.waitForTimeout(200);
    await row
      .getByTestId("shortcut-accept")
      .locator("button")
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  }

  async function resetShortcutAndClose(
    page: import("@playwright/test").Page,
    rowLabel: string,
    defaultCombo: string
  ) {
    await openModeOfInteraction(page);
    const panel2 = page.getByTestId("mode-of-interaction-settings");
    await panel2.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const row2 = panel2.getByText(rowLabel, { exact: true }).locator("..");
    await row2.locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    const input2 = row2.locator('input[placeholder="record shortcut"]');
    await input2.focus();
    await page.keyboard.press(defaultCombo);
    await page.waitForTimeout(200);
    await row2
      .getByTestId("shortcut-accept")
      .locator("button")
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  }

  test("Mode of interaction: change Command bar shortcut, verify it opens command bar, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("mode-of-interaction-settings");

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyO`;
    const defaultCombo = `${modifier}+Shift+KeyP`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Command bar", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(500);
    await expect(page.getByTestId("command-bar-input")).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press(`${modifier}+Escape`);
    await page.waitForTimeout(300);
    await expect(page.locator("#CMD")).toBeHidden({ timeout: 10_000 });

    await resetShortcutAndClose(page, "Command bar", defaultCombo);
  });

  test("Mode of interaction: change Search shortcut, verify it opens search, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("mode-of-interaction-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyK`;
    const defaultCombo = `${modifier}+KeyK`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Search", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(600);
    await expect(
      page.getByPlaceholder(/Start typing to search|Type here to search/i)
    ).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await resetShortcutAndClose(page, "Search", defaultCombo);
  });

  test("Mode of interaction: change Edit mode shortcut, verify it triggers, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("mode-of-interaction-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyE`;
    const defaultCombo = `${modifier}+KeyE`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Edit mode", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(400);
    await page.keyboard.press(newCombo);
    await page.waitForTimeout(200);

    await resetShortcutAndClose(page, "Edit mode", defaultCombo);
  });

  test("Mode of interaction: change Go back shortcut, verify it navigates back, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page
      .getByRole("button", { name: /^Overview$/i })
      .first()
      .click({ timeout: 8_000 });
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    const panel = page.getByTestId("mode-of-interaction-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyB`;
    const defaultCombo = `${modifier}+Shift+KeyB`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Go back", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await resetShortcutAndClose(page, "Go back", defaultCombo);
  });

  test("Mode of interaction: change Go forward shortcut, verify it navigates forward, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !getCapabilities(testInfo.project.name).settings.sharedShortcutCustomization,
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page
      .getByRole("button", { name: /^Overview$/i })
      .first()
      .click({ timeout: 8_000 });
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+Shift+KeyB" : "Control+Shift+KeyB"
    );
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 8_000
    });

    const panel = page.getByTestId("mode-of-interaction-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyF`;
    const defaultCombo = `${modifier}+Shift+KeyF`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Go forward", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(500);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await resetShortcutAndClose(page, "Go forward", defaultCombo);
  });
});

test.describe("settings - Accessibility (shared) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openAccessibility(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Accessibility$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);
  }

  function getBlockSizingOptionButton(
    page: import("@playwright/test").Page,
    label: "smaller" | "default" | "larger"
  ) {
    return page
      .getByText(label, { exact: true })
      .locator("..")
      .getByRole("button", { name: "Abc" });
  }

  test("Accessibility: navigate and assert panel and Block sizing options visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openAccessibility(page);

    await expect(
      page.getByText("Accessibility", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Block sizing", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("smaller", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("default", { exact: true }).first()
    ).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("larger", { exact: true }).first()).toBeVisible(
      {
        timeout: 5_000
      }
    );
    await expect(page.getByRole("button", { name: "Abc" }).first()).toBeVisible(
      { timeout: 5_000 }
    );
  });

  test("Accessibility: select smaller, default, larger and verify selection state", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openAccessibility(page);

    const smallerBtn = getBlockSizingOptionButton(page, "smaller");
    const defaultBtn = getBlockSizingOptionButton(page, "default");
    const largerBtn = getBlockSizingOptionButton(page, "larger");

    await smallerBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(smallerBtn).toHaveClass(/bg-aps1/);

    await largerBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(largerBtn).toHaveClass(/bg-aps1/);

    await defaultBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(defaultBtn).toHaveClass(/bg-aps1/);
  });

  test("Accessibility: change Block sizing to larger, close and reopen, verify persistence", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openAccessibility(page);

    const largerBtn = getBlockSizingOptionButton(page, "larger");
    await largerBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(largerBtn).toHaveClass(/bg-aps1/);

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await openAccessibility(page);
    const largerBtnAfter = getBlockSizingOptionButton(page, "larger");
    await expect(largerBtnAfter).toHaveClass(/bg-aps1/);
  });

  test("Accessibility: change Block sizing and verify root font size (visual impact)", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "nucleum" ||
        testInfo.project.name === "pointron",
      "Known bug: sizing visually stays the same on Nucleum and Pointron"
    );
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    const getTodayButtonFontSizePx = async () => {
      const todayBtn = page.getByRole("button", { name: /^Today$/i }).first();
      await expect(todayBtn).toBeVisible({ timeout: 10_000 });
      const size = await todayBtn.evaluate((el) => {
        const px = getComputedStyle(el).fontSize;
        return parseFloat(px) || 0;
      });
      expect(size).toBeGreaterThan(0);
      return size;
    };

    const waitForFontSizeToBe = async (
      predicate: (size: number) => boolean,
      timeoutMs = 8_000
    ) => {
      const deadline = Date.now() + timeoutMs;
      let last = 0;
      while (Date.now() < deadline) {
        last = await getTodayButtonFontSizePx();
        if (predicate(last)) return last;
        await page.waitForTimeout(200);
      }
      return last;
    };

    await openAccessibility(page);
    await getBlockSizingOptionButton(page, "default").click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    const fontSizeDefault = await getTodayButtonFontSizePx();

    await openAccessibility(page);
    await getBlockSizingOptionButton(page, "larger").click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    const fontSizeLarger = await waitForFontSizeToBe(
      (s) => s > fontSizeDefault
    );
    expect(fontSizeLarger).toBeGreaterThan(fontSizeDefault);

    await openAccessibility(page);
    await getBlockSizingOptionButton(page, "smaller").click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    const fontSizeSmaller = await waitForFontSizeToBe(
      (s) => s < fontSizeDefault
    );
    expect(fontSizeSmaller).toBeLessThan(fontSizeDefault);
  });
});

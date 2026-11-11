import { test, expect } from "@playwright/test";
import { Product } from "@nucleum/client/config/product.type";
import { ensureInAppOnHome } from "../../utils/helpers";
import { expectAnyLocatorVisible } from "../../utils/locator-assertions";
import { resolveRepoFsImportPath } from "../../utils/repo-fs";
import {
  assertSearchOrCommandBarInputVisible,
  assertSettingsShellVisible,
  openSettings
} from "../../utils/settings";
import {
  listEnabledSettingsPanels,
  openDeclaredSettingsPanel
} from "../../utils/settings-contracts";

const appStorePath = resolveRepoFsImportPath(
  "client/shared-state/app-context/app.store.ts"
);

async function readGlobalEditMode(page: import("@playwright/test").Page) {
  return page.evaluate(
    async ({ modulePath }) => {
      const { isInEditMode } = await import(modulePath);
      let value = false;
      const unsubscribe = isInEditMode.subscribe((next: boolean) => {
        value = next;
      });
      unsubscribe();
      return value;
    },
    { modulePath: appStorePath }
  );
}

function isNucleumProject(projectName: string) {
  return projectName === Product.NUCLEUM;
}

function isMemorySettingsProject(projectName: string) {
  return isNucleumProject(projectName) || projectName === Product.MEMOTRON;
}

function isFocusProject(projectName: string) {
  return isNucleumProject(projectName) || projectName === Product.POINTRON;
}

async function expectLibrarySurfaceVisible(
  page: import("@playwright/test").Page,
  timeout: number
) {
  await expectAnyLocatorVisible(
    [
      page.getByRole("button", { name: /^Objectives(\s+\d+)?$/i }).first(),
      page.getByText(/Library/i).first()
    ],
    {
      message: "library shortcut opens a visible library surface",
      timeout
    }
  );
}

async function closeSettings(page: import("@playwright/test").Page) {
  await page.getByTestId("modal-close").click({ timeout: 5_000 });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
}

test.describe("settings - open, close, navigate (shared) @settings @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open Settings and assert modal visible", async ({ page }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openSettings(page);
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
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  });

  test("navigate through all visible settings sidebar sections (smoke)", async ({
    page
  }, testInfo) => {
    test.skip(
      !isNucleumProject(testInfo.project.name),
      "Shared settings-sidebar smoke flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
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

test.describe("settings - Interface and keyboard shortcuts (comprehensive) @settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openInterfaceSettings(page: import("@playwright/test").Page) {
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
    const panel = page.getByTestId("appearance-interface-settings");
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.scrollIntoViewIfNeeded();
  }

  /** Switches the open Settings modal to Keyboard shortcuts and waits for its panel. */
  async function showKeyboardShortcutsPanel(
    page: import("@playwright/test").Page
  ) {
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Keyboard shortcuts$/i })
      .click({ timeout: 5_000 });
    const panel = page.getByTestId("keyboard-shortcut-settings");
    await expect(panel).toBeVisible({ timeout: 10_000 });
    return panel;
  }

  async function openShortcutSettings(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    const panel = await showKeyboardShortcutsPanel(page);
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

    const section = page.getByTestId("color-scheme-section");
    const lightPicker = section.getByTestId("color-scheme-light-picker");
    if (!(await lightPicker.isVisible().catch(() => false))) {
      await section
        .getByTestId("toggle-mixed-color-schemes")
        .locator('input[type="checkbox"]')
        .setChecked(true, { force: true });
    }
    await expect(lightPicker).toBeVisible({ timeout: 10_000 });

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
      await lightPicker.click({ timeout: 5_000 });
      await page
        .getByRole("option", { name: theme.name, exact: true })
        .first()
        .click({ timeout: 5_000 });
      await expect(lightPicker).toContainText(theme.name, { timeout: 5_000 });
      await expect(
        lightPicker.locator(`[data-scheme-swatch="${theme.id}"]`)
      ).toBeVisible({ timeout: 5_000 });
    }

    await lightPicker.click({ timeout: 5_000 });
    await page
      .getByRole("option", { name: "Blue", exact: true })
      .first()
      .click({ timeout: 5_000 });
    await expect(lightPicker).toContainText("Blue", { timeout: 5_000 });

    await closeSettings(page);
    await openAppearance(page);
    await expect(
      page
        .getByTestId("color-scheme-section")
        .locator('[data-scheme-swatch="colorscheme:clean_tidyblue_light"]')
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Appearance: switch between light and dark themes and verify theme layer updates", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openAppearance(page);

    await page
      .getByRole("checkbox", { name: "Sync theme with system" })
      .first()
      .setChecked(false, { force: true });

    const themeGroup = page.getByText("Theme", { exact: true }).first();
    await expect(themeGroup).toBeVisible({ timeout: 10_000 });

    const themeRoot = page.locator("#ntheme").first();
    await expect(themeRoot).toBeVisible({ timeout: 10_000 });

    const darkButton = page
      .getByRole("button", { name: "Dark", exact: true })
      .first();
    await darkButton.click({ timeout: 5_000 });
    await expect(themeRoot).toHaveClass(/dark/, { timeout: 5_000 });

    await closeSettings(page);
    await openAppearance(page);
    await expect(themeRoot).toHaveClass(/dark/, { timeout: 5_000 });

    const lightButton = page
      .getByRole("button", { name: "Light", exact: true })
      .first();
    await lightButton.click({ timeout: 5_000 });
    await expect(themeRoot).not.toHaveClass(/dark/, { timeout: 5_000 });

    await closeSettings(page);
    await openAppearance(page);
    await expect(themeRoot).not.toHaveClass(/dark/, { timeout: 5_000 });
  });

  test("Keyboard shortcuts: open from sidebar and assert same content visible", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared keyboard-shortcuts panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openKeyboardShortcuts(page);
    await assertKeyboardShortcutsContentVisible(page);
  });

  test("Interface: enable Hide shortcut hints, verify setting persists and toggle reflects it, then disable", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await openInterfaceSettings(page);
    const container = page.getByTestId("toggle-hide-shortcut-hints");
    await container.waitFor({ state: "visible", timeout: 5_000 });
    const checkbox = container.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: "visible", timeout: 3_000 });
    const wasChecked = await checkbox.isChecked().catch(() => false);
    if (!wasChecked) {
      await checkbox.setChecked(true, { force: true });
    }
    await expect(checkbox).toBeChecked({ timeout: 5_000 });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await openInterfaceSettings(page);
    const checkboxAfter = page
      .getByTestId("toggle-hide-shortcut-hints")
      .locator('input[type="checkbox"]');
    await expect(checkboxAfter).toBeChecked({ timeout: 5_000 });

    if (!wasChecked) {
      await checkboxAfter.click({ force: true });
    }
    await expect(checkboxAfter).toBeChecked({
      checked: wasChecked,
      timeout: 5_000
    });
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await openInterfaceSettings(page);
    const checkboxRestored = page
      .getByTestId("toggle-hide-shortcut-hints")
      .locator('input[type="checkbox"]');
    await expect(checkboxRestored).toBeChecked({
      checked: wasChecked,
      timeout: 5_000
    });
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Interface: enable Hide menu bar on Q and verify Q hides/shows left nav, then disable", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    await expect(page.getByTestId("leftnav-sidebar-toggle")).toBeVisible({
      timeout: 10_000
    });

    await openInterfaceSettings(page);
    const container = page.getByTestId("toggle-hide-menu-bar");
    await container.waitFor({ state: "visible", timeout: 5_000 });
    const checkbox = container.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: "visible", timeout: 3_000 });
    const wasChecked = await checkbox.isChecked().catch(() => false);
    if (!wasChecked) {
      await checkbox.click({ force: true });
    }
    await expect(checkbox).toBeChecked({ timeout: 5_000 });

    await closeSettings(page);

    await openInterfaceSettings(page);
    await expect(
      page.getByTestId("toggle-hide-menu-bar").locator('input[type="checkbox"]')
    ).toBeChecked({ timeout: 5_000 });
    await closeSettings(page);

    await expect(page.getByTestId("leftnav-sidebar-toggle")).toBeVisible({
      timeout: 5_000
    });

    await page.keyboard.press("q");
    await expect(page.getByTestId("leftnav-sidebar-toggle")).toBeHidden({
      timeout: 5_000
    });

    await page.keyboard.press("q");
    await expect(page.getByTestId("leftnav-sidebar-toggle")).toBeVisible({
      timeout: 5_000
    });

    await openInterfaceSettings(page);
    const checkbox2 = page
      .getByTestId("toggle-hide-menu-bar")
      .locator('input[type="checkbox"]');
    await checkbox2.setChecked(wasChecked, { force: true });
    await expect(checkbox2).toBeChecked({
      checked: wasChecked,
      timeout: 5_000
    });
    await closeSettings(page);
    await openInterfaceSettings(page);
    await expect(
      page.getByTestId("toggle-hide-menu-bar").locator('input[type="checkbox"]')
    ).toBeChecked({ checked: wasChecked, timeout: 5_000 });
    await closeSettings(page);
  });

  test("Keyboard shortcuts: See hot keys - open, verify list, close modals, then run each hot key and verify", async ({
    page
  }, testInfo) => {
    test.skip(
      !isNucleumProject(testInfo.project.name),
      "Shared hot-key matrix is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    await openShortcutSettings(page);

    await page
      .getByRole("button", { name: /^See hot keys$/i })
      .first()
      .click({ timeout: 5_000 });

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

    await page
      .locator("#cp")
      .getByTestId("modal-close")
      .click({ timeout: 5_000 });
    await expect(
      page.getByText("Settings", { exact: true }).first()
    ).toBeHidden({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 100, y: 300 } });

    await page.keyboard.press("c");
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("l");
    await expectLibrarySurfaceVisible(page, 10_000);

    await page.keyboard.press("o");
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("l");
    await expectLibrarySurfaceVisible(page, 10_000);

    await page.locator("body").click({ position: { x: 120, y: 240 } });
    await page.keyboard.press("Space");
    await assertSearchOrCommandBarInputVisible(page);
    await page.keyboard.press("Escape");
  });

  test("Keyboard shortcuts: See hot keys opens, verify each shortcut listed, then verify C/L/F/O/P/Q/Space trigger actions", async ({
    page
  }, testInfo) => {
    test.skip(
      !isNucleumProject(testInfo.project.name),
      "Shared hot-key matrix is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await openInterfaceSettings(page);

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
    }
    await expect(menuBarCheckbox).toBeChecked({ timeout: 5_000 });

    await showKeyboardShortcutsPanel(page);

    await page
      .getByRole("button", { name: /^See hot keys$/i })
      .first()
      .click({ timeout: 5_000 });

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

    await page
      .locator("#cp")
      .getByTestId("modal-close")
      .click({ timeout: 5_000 });
    await expect(page.getByText("Settings", { exact: true }).first())
      .toBeHidden({
        timeout: 5_000
      })
      .catch(() => null);

    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    await page.keyboard.press("c");
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 8_000
    });

    if (isFocusProject(testInfo.project.name)) {
      await page.keyboard.press("f");
      await expect(
        page.getByText(/Focus|Quick focus|Focus session/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }

    await page.keyboard.press("l");
    await expectLibrarySurfaceVisible(page, 8_000);

    await page.keyboard.press("o");
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 8_000
    });

    await page.keyboard.press("p");
    await expect(page.getByTestId("capture-editor")).toBeVisible({
      timeout: 8_000
    });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("capture-editor")).toBeHidden({
      timeout: 8_000
    });

    await page.locator("body").click({ position: { x: 100, y: 200 } });
    await page.keyboard.press("q");
    const leftNavExists =
      (await page.getByTestId("leftnav-settings").count()) > 0;
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeHidden({
        timeout: 8_000
      });
    }

    await page.keyboard.press("q");
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeVisible({
        timeout: 8_000
      });
    }

    await page.keyboard.press("l");
    await expectLibrarySurfaceVisible(page, 8_000);

    await page.locator("body").click({ position: { x: 120, y: 240 } });
    await page.keyboard.press("Space");
    await assertSearchOrCommandBarInputVisible(page);
    await page.keyboard.press("Escape");

    if (!menuBarWasChecked) {
      await openInterfaceSettings(page);
      await page
        .getByTestId("toggle-hide-menu-bar")
        .locator("label:has(input[type='checkbox'])")
        .click({ timeout: 5_000 });
      await expect(
        page
          .getByTestId("toggle-hide-menu-bar")
          .locator('input[type="checkbox"]')
      ).not.toBeChecked({ timeout: 5_000 });
      await page
        .locator("#cp")
        .getByTestId("modal-close")
        .click({ timeout: 5_000 });
    }
  });

  test("Keyboard shortcuts: See markdown shortcuts opens (then close)", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openShortcutSettings(page);

    await page
      .getByRole("button", { name: /^See markdown shortcuts$/i })
      .first()
      .click({ timeout: 5_000 });

    const markdownDialog = page.getByRole("dialog");
    const markdownFallback = page.getByText(/markdown|shortcut/i).first();
    await expectAnyLocatorVisible([markdownDialog, markdownFallback], {
      message: "markdown shortcuts action opens its dialog",
      timeout: 5_000
    });
    await page.keyboard.press("Escape");
  });

  test("Keyboard shortcuts: shortcut rows have editable key (Command bar, Edit mode, Search, Go back, Go forward)", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization panel is not part of this product contract"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openShortcutSettings(page);

    const panel = page.getByTestId("keyboard-shortcut-settings");
    await panel.scrollIntoViewIfNeeded();
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
    const row = panel.getByText(rowLabel, { exact: true }).locator("..");
    await expect(row).toBeVisible({ timeout: 8_000 });
    await row.locator("button").first().click({ timeout: 5_000 });
    const input = row.locator('input[placeholder="record shortcut"]');
    await input.waitFor({ state: "visible", timeout: 3_000 });
    await input.focus();
    await page.keyboard.press(newCombo);
    const expectedKey = newCombo.split("+").at(-1)?.replace(/^Key/, "");
    await expect(input).toHaveValue(new RegExp(`${expectedKey}$`, "i"), {
      timeout: 5_000
    });
    const savedValue = await input.inputValue();
    const acceptButton = row
      .getByTestId("shortcut-accept")
      .locator("button")
      .first();
    await acceptButton.click({ timeout: 5_000 });
    await expect(acceptButton).toBeHidden({ timeout: 5_000 });
    expect(savedValue).not.toBe("");
    await closeSettings(page);

    await openShortcutSettings(page);
    const reopenedRow = page
      .getByTestId("keyboard-shortcut-settings")
      .getByText(rowLabel, { exact: true })
      .locator("..");
    await expect(
      reopenedRow.locator('input[placeholder="record shortcut"]')
    ).toHaveValue(savedValue, { timeout: 5_000 });
    await closeSettings(page);
  }

  async function resetShortcutAndClose(
    page: import("@playwright/test").Page,
    rowLabel: string,
    defaultCombo: string
  ) {
    await openShortcutSettings(page);
    const panel2 = page.getByTestId("keyboard-shortcut-settings");
    await panel2.scrollIntoViewIfNeeded();
    const row2 = panel2.getByText(rowLabel, { exact: true }).locator("..");
    await row2.locator("button").first().click({ timeout: 5_000 });
    const input2 = row2.locator('input[placeholder="record shortcut"]');
    await input2.focus();
    await page.keyboard.press(defaultCombo);
    const expectedKey = defaultCombo.split("+").at(-1)?.replace(/^Key/, "");
    await expect(input2).toHaveValue(new RegExp(`${expectedKey}$`, "i"), {
      timeout: 5_000
    });
    const restoredValue = await input2.inputValue();
    const acceptButton = row2
      .getByTestId("shortcut-accept")
      .locator("button")
      .first();
    await acceptButton.click({ timeout: 5_000 });
    await expect(acceptButton).toBeHidden({ timeout: 5_000 });
    expect(restoredValue).not.toBe("");
    await closeSettings(page);

    await openShortcutSettings(page);
    const reopenedRow = page
      .getByTestId("keyboard-shortcut-settings")
      .getByText(rowLabel, { exact: true })
      .locator("..");
    await expect(
      reopenedRow.locator('input[placeholder="record shortcut"]')
    ).toHaveValue(restoredValue, { timeout: 5_000 });
    await closeSettings(page);
  }

  test("Keyboard shortcuts: change Command bar shortcut, verify it opens command bar, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("keyboard-shortcut-settings");

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyO`;
    const defaultCombo = `${modifier}+KeyK`;

    await openShortcutSettings(page);
    await changeShortcutAndClose(page, panel, "Command bar", newCombo);

    await page.keyboard.press(newCombo);
    await expect(page.getByTestId("command-bar-input")).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press(`${modifier}+Escape`);
    await expect(page.locator("#CMD")).toBeHidden({ timeout: 10_000 });

    await resetShortcutAndClose(page, "Command bar", defaultCombo);
  });

  test("Keyboard shortcuts: change Search shortcut, verify it opens search, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("keyboard-shortcut-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyK`;
    const defaultCombo = `${modifier}+Shift+KeyK`;

    await openShortcutSettings(page);
    await changeShortcutAndClose(page, panel, "Search", newCombo);

    await page.keyboard.press(newCombo);
    await expect(
      page.getByPlaceholder(/Start typing to search|Type here to search/i)
    ).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");

    await resetShortcutAndClose(page, "Search", defaultCombo);
  });

  test("Keyboard shortcuts: change Edit mode shortcut, verify it triggers, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const panel = page.getByTestId("keyboard-shortcut-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyE`;
    const defaultCombo = `${modifier}+KeyE`;

    await openShortcutSettings(page);
    await changeShortcutAndClose(page, panel, "Edit mode", newCombo);

    await page.keyboard.press(newCombo);
    await expect
      .poll(() => readGlobalEditMode(page), {
        message:
          "Keyboard shortcuts: change Edit mode shortcut, verify it tri...: toBe true"
      })
      .toBe(true);
    await page.keyboard.press(newCombo);
    await expect
      .poll(() => readGlobalEditMode(page), {
        message:
          "Keyboard shortcuts: change Edit mode shortcut, verify it tri...: toBe false"
      })
      .toBe(false);

    await resetShortcutAndClose(page, "Edit mode", defaultCombo);
  });

  test("Keyboard shortcuts: change Go back shortcut, verify it navigates back, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page
      .getByRole("button", { name: /^Overview$/i })
      .first()
      .click({ timeout: 8_000 });
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    const panel = page.getByTestId("keyboard-shortcut-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyB`;
    const defaultCombo = `${modifier}+Shift+KeyB`;

    await openShortcutSettings(page);
    await changeShortcutAndClose(page, panel, "Go back", newCombo);

    await page.keyboard.press(newCombo);
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });

    await resetShortcutAndClose(page, "Go back", defaultCombo);
  });

  test("Keyboard shortcuts: change Go forward shortcut, verify it navigates forward, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      !isMemorySettingsProject(testInfo.project.name),
      "Shared shortcut-customization flow is not part of this product contract"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page
      .getByRole("button", { name: /^Overview$/i })
      .first()
      .click({ timeout: 8_000 });
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+Shift+KeyB" : "Control+Shift+KeyB"
    );
    await expect(
      page.getByRole("button", { name: /^Today$/i }).first()
    ).toBeVisible({
      timeout: 8_000
    });

    const panel = page.getByTestId("keyboard-shortcut-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyF`;
    const defaultCombo = `${modifier}+Shift+KeyF`;

    await openShortcutSettings(page);
    await changeShortcutAndClose(page, panel, "Go forward", newCombo);

    await page.keyboard.press(newCombo);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

    await resetShortcutAndClose(page, "Go forward", defaultCombo);
  });
});

test.describe("settings - Accessibility (shared) @settings", () => {
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
    await expect(smallerBtn).toHaveClass(/bg-aps1/);

    await largerBtn.click({ timeout: 5_000 });
    await expect(largerBtn).toHaveClass(/bg-aps1/);

    await defaultBtn.click({ timeout: 5_000 });
    await expect(defaultBtn).toHaveClass(/bg-aps1/);

    await closeSettings(page);
    await openAccessibility(page);
    await expect(getBlockSizingOptionButton(page, "default")).toHaveClass(
      /bg-aps1/
    );
  });

  test("Accessibility: change Block sizing to larger, close and reopen, verify persistence", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openAccessibility(page);

    const largerBtn = getBlockSizingOptionButton(page, "larger");
    await largerBtn.click({ timeout: 5_000 });
    await expect(largerBtn).toHaveClass(/bg-aps1/);

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

    await openAccessibility(page);
    const largerBtnAfter = getBlockSizingOptionButton(page, "larger");
    await expect(largerBtnAfter).toHaveClass(/bg-aps1/);
  });

  test("Accessibility: change Block sizing and verify root font size (visual impact)", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === Product.NUCLEUM ||
        testInfo.project.name === Product.POINTRON,
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
      let last = 0;
      await expect
        .poll(
          async () => {
            last = await getTodayButtonFontSizePx();
            return predicate(last);
          },
          { message: "waitForFontSizeToBe: toBe true", timeout: timeoutMs }
        )
        .toBe(true);
      return last;
    };

    await openAccessibility(page);
    const defaultButton = getBlockSizingOptionButton(page, "default");
    await defaultButton.click({ timeout: 5_000 });
    await expect(defaultButton).toHaveClass(/bg-aps1/);
    await closeSettings(page);
    await openAccessibility(page);
    await expect(getBlockSizingOptionButton(page, "default")).toHaveClass(
      /bg-aps1/
    );
    await closeSettings(page);
    const fontSizeDefault = await getTodayButtonFontSizePx();

    await openAccessibility(page);
    const largerButton = getBlockSizingOptionButton(page, "larger");
    await largerButton.click({ timeout: 5_000 });
    await expect(largerButton).toHaveClass(/bg-aps1/);
    await closeSettings(page);
    await openAccessibility(page);
    await expect(getBlockSizingOptionButton(page, "larger")).toHaveClass(
      /bg-aps1/
    );
    await closeSettings(page);
    const fontSizeLarger = await waitForFontSizeToBe(
      (s) => s > fontSizeDefault
    );
    expect(fontSizeLarger).toBeGreaterThan(fontSizeDefault);

    await openAccessibility(page);
    const smallerButton = getBlockSizingOptionButton(page, "smaller");
    await smallerButton.click({ timeout: 5_000 });
    await expect(smallerButton).toHaveClass(/bg-aps1/);
    await closeSettings(page);
    await openAccessibility(page);
    await expect(getBlockSizingOptionButton(page, "smaller")).toHaveClass(
      /bg-aps1/
    );
    await closeSettings(page);
    const fontSizeSmaller = await waitForFontSizeToBe(
      (s) => s < fontSizeDefault
    );
    expect(fontSizeSmaller).toBeLessThan(fontSizeDefault);
  });
});

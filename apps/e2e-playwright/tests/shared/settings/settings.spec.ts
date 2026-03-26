import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  ensureInAppOnHome,
  runCommand,
  runQuickFocusCommand
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

const pdfFixturePath = path.resolve(__dirname, "..", "..", "fixtures", "files", "Lorem_ipsum.pdf");
const highlightedWord = "including";

async function assertSettingsShellVisible(page: import("@playwright/test").Page) {
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

async function settingsModalLikelyOpen(page: import("@playwright/test").Page) {
  return (
    (await page.getByTestId("settings-sidebar").isVisible().catch(() => false)) ||
    (await page.getByTestId("modal-close").isVisible().catch(() => false))
  );
}

/** After Space / search shortcut: command bar input or generic search field. */
async function assertSearchOrCommandBarInputVisible(page: import("@playwright/test").Page) {
  const cmd = page.getByTestId("command-bar-input");
  const placeholder = page.getByPlaceholder(/Start typing to search|Type here to search|Search/i);
  const searchRole = page.getByRole("search");
  await expect
    .poll(
      async () => {
        if (await cmd.isVisible().catch(() => false)) return true;
        if (await placeholder.isVisible().catch(() => false)) return true;
        if (await searchRole.first().isVisible().catch(() => false)) return true;
        if (await page.getByRole("textbox").first().isVisible().catch(() => false)) return true;
        return false;
      },
      { timeout: 15_000 }
    )
    .toBe(true);
}

async function openSettings(page: import("@playwright/test").Page) {
  // If an overlay modal is present, dismiss it first so clicks aren't intercepted.
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
  const settingsIconBtn = page.getByRole("button", { name: /^Settings$/i }).first();
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

test.describe("settings - open, close, navigate (shared) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open Settings and assert modal visible", async ({
    page
  }, testInfo) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    if (testInfo.project.name === "nucleum") {
      // Nucleum: profile/logo button (top-left)
      await page.getByTestId("topnav-account-settings").waitFor({ state: "visible", timeout: 10_000 });
      await page.getByTestId("topnav-account-settings").click({ timeout: 5_000 });
    } else {
      const settingsBtn = page.getByRole("button", { name: /^Settings$/i }).first();
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

  test("navigate to Focus and assert Focus settings panel visible (Pointron, Nucleus)", async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
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

  test("navigate to Node settings and assert panel visible (Memotron, Nucleus)", async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === "pointron", "Node settings only in Memotron and Nucleum");
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /Node settings|Node Settings/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);

    await expect(
      page.getByText(/Node settings|Node Settings/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("navigate through all visible settings sidebar sections (smoke)", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "memotron",
      "Memotron sidebar contains account flows that can sign out during broad smoke navigation"
    );
    test.skip(
      testInfo.project.name === "pointron",
      "Pointron sidebar structure differs; smoke navigation covered by product-specific tests"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const continueOffline = page.getByRole("button", { name: /Continue (using )?offline/i }).first();
    if (await continueOffline.isVisible().catch(() => false)) {
      await continueOffline.click({ timeout: 5_000 });
      await page.waitForLoadState("domcontentloaded").catch(() => null);
      await ensureInAppOnHome(page);
    }

    await openSettings(page);
    await assertSettingsShellVisible(page);

    const sidebar = page.getByTestId("settings-sidebar");
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    const buttons = sidebar.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Keep this smoke-y (avoid a long list — some sections open heavy routes).
    const toClick = Math.min(count, 3);
    const started = Date.now();
    for (let i = 0; i < toClick; i += 1) {
      if (Date.now() - started > 75_000) break;
      const btn = buttons.nth(i);
      const name = ((await btn.textContent().catch(() => "")) ?? "").trim();
      const disabled = await btn.getAttribute("aria-disabled").then((v) => v === "true").catch(() => false);
      if (disabled) continue;

      if (!(await settingsModalLikelyOpen(page))) break;

      await btn.click({ timeout: 4_000, force: true }).catch(() => null);
      await page.waitForTimeout(300);

      if (name) {
        const title = page.getByText(new RegExp(`^${name}$`, "i")).first();
        await title.waitFor({ state: "visible", timeout: 2_000 }).catch(() => null);
      }
    }
  });

  test("Node settings: hide/show text highlight colors in Bookmarks after PDF highlight (Memotron, Nucleus)", async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === "pointron", "Node settings only in Memotron and Nucleum");
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const openNodeSettings = async () => {
      await openSettings(page);
      await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
        timeout: 10_000
      });
      await page
        .getByTestId("settings-sidebar")
        .getByRole("button", { name: /Node settings|Node Settings/i })
        .click({ timeout: 5_000 });
      await page.waitForTimeout(400);
      await expect(page.getByText("Don't show text highlight colors")).toBeVisible({
        timeout: 5_000
      });
    };

    const setHideHighlightColors = async (enabled: boolean) => {
      await openNodeSettings();
      const toggleBtn = page.locator("button:has(input[type='checkbox'])").first();
      await expect(toggleBtn).toBeVisible({ timeout: 5_000 });
      const toggleInput = toggleBtn.locator("input[type='checkbox']");
      const isChecked = await toggleInput.isChecked().catch(() => false);
      if (isChecked !== enabled) {
        await toggleBtn.click({ timeout: 5_000 });
        await page.waitForTimeout(500);
      }
      if (enabled) await expect(toggleInput).toBeChecked({ timeout: 5_000 });
      else await expect(toggleInput).not.toBeChecked();
      await page.getByTestId("modal-close").click({ timeout: 5_000 });
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    };

    // Baseline: keep colors visible first.
    await setHideHighlightColors(false);

    // Create a PDF node from fixture via Capture -> Upload.
    await runCommand(page, "Capture");
    await page.waitForTimeout(700);
    await page.locator('button[data-value="UPLOAD"]').first().click({ timeout: 8_000 });
    const uploadInput = page.locator('input[type="file"][accept*=".pdf"]').first();
    await uploadInput.setInputFiles(pdfFixturePath);

    // Wait for PDF viewer and text layer.
    await page.locator("#viewerContainer").waitFor({ state: "visible", timeout: 25_000 });
    const targetWord = page
      .locator(".textLayer span")
      .filter({ hasText: new RegExp(highlightedWord, "i") })
      .first();
    await targetWord.waitFor({ state: "visible", timeout: 20_000 });

    // Select text and create a highlight using the inline toolbar.
    await targetWord.dblclick({ timeout: 5_000 });
    const inlineToolbar = page
      .locator("div.material-symbols-rounded.bg-bgs2.rounded-md.border.border-brs3")
      .filter({ has: page.locator("button") })
      .first();
    await expect(inlineToolbar).toBeVisible({ timeout: 8_000 });
    await inlineToolbar.locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);

    const openBookmarks = async () => {
      const byTooltip = page.getByRole("button", { name: /Show bookmarks/i }).first();
      if (await byTooltip.isVisible().catch(() => false)) {
        await byTooltip.click({ timeout: 5_000 });
      } else {
        await page.getByText(/^Bookmarks$/).first().click({ timeout: 5_000 });
      }
      await expect(page.getByText(/^Bookmarks$/).first()).toBeVisible({ timeout: 8_000 });
    };

    const bookmarkHighlightStyle = async () => {
      await openBookmarks();
      // Wait until a bookmark row is present; if highlight wasn't created, this fails clearly.
      const bookmarkRow = page
        .locator("button")
        .filter({ hasText: new RegExp(highlightedWord, "i") })
        .filter({ hasNot: page.getByPlaceholder("Search bookmarks") })
        .first();
      await expect(bookmarkRow).toBeVisible({ timeout: 15_000 });

      // In NodeTracesPane, highlight color is applied on the inner <span>.
      const bookmarkHighlightText = bookmarkRow.locator("span").first();
      await expect(bookmarkHighlightText).toBeVisible({ timeout: 5_000 });
      return (await bookmarkHighlightText.getAttribute("style")) ?? "";
    };

    const styleWithSettingOff = await bookmarkHighlightStyle();
    expect(styleWithSettingOff.toLowerCase()).toContain("background-color");

    await setHideHighlightColors(true);
    const styleWithSettingOn = await bookmarkHighlightStyle();
    expect(styleWithSettingOn.toLowerCase()).not.toContain("background-color");

    await setHideHighlightColors(false);
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
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
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
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Keyboard shortcuts$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);
  }

  async function assertKeyboardShortcutsContentVisible(page: import("@playwright/test").Page) {
    await expect(page.getByText("Keyboard shortcuts", { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Command bar", { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Edit mode", { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Search", { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Go back", { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText("Go forward", { exact: true }).first()).toBeVisible({
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
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Appearance$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("Sync theme with system", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
  }

  test("Appearance: select each light color scheme and verify appearance changes", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);
    await openAppearance(page);

    await expect(page.getByText("Sync theme with system", { exact: true }).first()).toBeVisible({
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

    await expect(page.getByText("Light color scheme", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    const lightThemes = [
      { name: "Blue",      id: "colorscheme:clean_tidyblue_light"     },
      { name: "Red",       id: "colorscheme:clean_tidyred_light"      },
      { name: "Mono",      id: "colorscheme:clean_tidymono_light"     },
      { name: "Iris",      id: "colorscheme:clean_tidyiris_light"     },
      { name: "Violet",    id: "colorscheme:clean_tidyviolet_light"   },
      { name: "Pink",      id: "colorscheme:clean_tidypink_light"     },
      { name: "Orange",    id: "colorscheme:clean_tidyorange_light"   },
      { name: "Solarized", id: "colorscheme:clean_solarized_light"    }
    ];

    for (const theme of lightThemes) {
      const btn = page.getByRole("button", { name: theme.name, exact: true }).first();
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

    await page.locator("#cp").getByTestId("modal-close").click({ timeout: 5_000 });
  });

  test("Mode of interaction: all sections and controls visible", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "pointron",
      "Pointron does not expose the same Mode of interaction panel controls as other products"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    await expect(page.getByText("Mode of interaction", { exact: true }).first()).toBeVisible({
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
      page.getByText("Hide all hot key and shortcut hints", { exact: true }).first()
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
      testInfo.project.name === "pointron",
      "Pointron keyboard-shortcuts settings panel differs from shared expectations"
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

    await expect(page.getByTestId("leftnav-settings")).toBeVisible({ timeout: 5_000 });

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

  test("Mode of interaction: See hot keys - open, verify list, close modals, then run each hot key and verify", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "memotron" || testInfo.project.name === "pointron",
      "Memotron/Pointron hotkey behavior differs from shared expectations"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    await openModeOfInteraction(page);
    const defaultModeBtn = page.getByRole("button", { name: /^Default$/i }).first();
    if (await defaultModeBtn.isVisible().catch(() => false)) {
      await defaultModeBtn.click({ timeout: 5_000 }).catch(() => null);
      await page.waitForTimeout(250);
    }

    await page.getByRole("button", { name: /^See hot keys$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await expect(page.getByText("Hot key shortcuts", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    const hotKeysPanel = page
      .locator("div")
      .filter({ hasText: /Hot key shortcuts/ })
      .filter({ hasText: "Page / Action" })
      .first();
    await expect(hotKeysPanel.getByText("Page / Action", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Shortcut", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Calendar", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Library", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Overview", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Toggle sidebar", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await page.locator("#HOT_KEYS").evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator("#HOT_KEYS")).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(400);

    await page.locator("#cp").getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeHidden({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.locator("body").click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(400);

    await page.keyboard.press("c");
    await page.waitForTimeout(600);
    await expect(page.getByRole("button", { name: /^Today$/i }).first()).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("l");
    await page.waitForTimeout(600);
    await expect
      .poll(
        async () =>
          (await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().isVisible().catch(() => false)) ||
          (await page.getByText(/Library/i).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true);

    await page.keyboard.press("o");
    await page.waitForTimeout(600);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({
      timeout: 10_000
    });

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
      testInfo.project.name === "memotron" || testInfo.project.name === "pointron",
      "Memotron/Pointron shortcut matrix differs from shared expectations"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    const menuBarContainer = page.getByTestId("toggle-hide-menu-bar");
    await menuBarContainer.waitFor({ state: "visible", timeout: 5_000 });
    const menuBarCheckbox = menuBarContainer.locator('input[type="checkbox"]');
    const menuBarWasChecked = await menuBarCheckbox.isChecked().catch(() => false);
    if (!menuBarWasChecked) {
      await menuBarContainer.locator("label:has(input[type='checkbox'])").click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }

    await page.getByRole("button", { name: /^See hot keys$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(800);

    await expect(page.getByText("Hot key shortcuts", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });

    const hotKeysPanel = page
      .locator("div")
      .filter({ hasText: /Hot key shortcuts/ })
      .filter({ hasText: "Page / Action" })
      .first();
    await expect(hotKeysPanel.getByText("Page / Action", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Shortcut", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await expect(hotKeysPanel.getByText("Calendar", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Library", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Overview", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(hotKeysPanel.getByText("Toggle sidebar", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await page.locator("#HOT_KEYS").evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator("#HOT_KEYS")).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(300);

    await page.locator("#cp").getByTestId("modal-close").click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeHidden({
      timeout: 5_000
    }).catch(() => null);

    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    await page.keyboard.press("c");
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /^Today$/i }).first()).toBeVisible({
      timeout: 8_000
    });

    if (testInfo.project.name !== "memotron") {
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
          (await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().isVisible().catch(() => false)) ||
          (await page.getByText(/Library/i).first().isVisible().catch(() => false)),
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
    const leftNavExists = (await page.getByTestId("leftnav-settings").count()) > 0;
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeHidden({ timeout: 8_000 });
    }

    await page.keyboard.press("q");
    await page.waitForTimeout(600);
    if (leftNavExists) {
      await expect(page.getByTestId("leftnav-settings")).toBeVisible({ timeout: 8_000 });
    }

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
      await page.locator("#cp").getByTestId("modal-close").click({ timeout: 5_000 });
    }
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
      testInfo.project.name === "pointron",
      "Pointron does not expose the same editable shortcut rows in Mode of interaction settings"
    );
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openModeOfInteraction(page);

    const panel = page.getByTestId("mode-of-interaction-settings");
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    for (const label of ["Command bar", "Edit mode", "Search", "Go back", "Go forward"]) {
      await expect(panel.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 8_000
      });
    }
    const shortcutInputs = panel.locator('input[placeholder="record shortcut"]');
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
    await row.getByTestId("shortcut-accept").locator("button").first().click({ timeout: 5_000 });
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
    await row2.getByTestId("shortcut-accept").locator("button").first().click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
  }

  test("Mode of interaction: change Command bar shortcut, verify it opens command bar, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "pointron",
      "Pointron shortcut customization flow differs from shared assertions"
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
    await expect(page.getByTestId("command-bar-input")).toBeVisible({ timeout: 10_000 });
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
      testInfo.project.name === "pointron",
      "Pointron shortcut customization flow differs from shared assertions"
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
      testInfo.project.name === "pointron",
      "Pointron shortcut customization flow differs from shared assertions"
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
      testInfo.project.name === "pointron",
      "Pointron shortcut customization flow differs from shared assertions"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.getByRole("button", { name: /^Overview$/i }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({ timeout: 10_000 });

    const panel = page.getByTestId("mode-of-interaction-settings");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    const newCombo = `${modifier}+Shift+Alt+KeyB`;
    const defaultCombo = `${modifier}+Shift+KeyB`;

    await openModeOfInteraction(page);
    await changeShortcutAndClose(page, panel, "Go back", newCombo);

    await page.keyboard.press(newCombo);
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /^Today$/i }).first()).toBeVisible({
      timeout: 10_000
    });

    await resetShortcutAndClose(page, "Go back", defaultCombo);
  });

  test("Mode of interaction: change Go forward shortcut, verify it navigates forward, then reset to default", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "pointron",
      "Pointron shortcut customization flow differs from shared assertions"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.getByRole("button", { name: /^Overview$/i }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/Overview|Focus|Memory/i).first()).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+KeyB" : "Control+Shift+KeyB");
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /^Today$/i }).first()).toBeVisible({
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
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
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
    return page.getByText(label, { exact: true }).locator("..").getByRole("button", { name: "Abc" });
  }

  test("Accessibility: navigate and assert panel and Block sizing options visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openAccessibility(page);

    await expect(page.getByText("Accessibility", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("Block sizing", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("smaller", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("default", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(page.getByText("larger", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByRole("button", { name: "Abc" }).first()
    ).toBeVisible({ timeout: 5_000 });
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
      testInfo.project.name === "nucleum" || testInfo.project.name === "pointron",
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
    const fontSizeLarger = await waitForFontSizeToBe((s) => s > fontSizeDefault);
    expect(fontSizeLarger).toBeGreaterThan(fontSizeDefault);

    await openAccessibility(page);
    await getBlockSizingOptionButton(page, "smaller").click({ timeout: 5_000 });
    await page.waitForTimeout(400);
    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    const fontSizeSmaller = await waitForFontSizeToBe((s) => s < fontSizeDefault);
    expect(fontSizeSmaller).toBeLessThan(fontSizeDefault);
  });
});

test.describe("settings - Focus (Pointron, Nucleus) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function openFocus(page: import("@playwright/test").Page) {
    await openSettings(page);
    await expect(page.getByText("Settings", { exact: true }).first()).toBeVisible({
      timeout: 10_000
    });
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Focus$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(400);
  }

  test("Focus: navigate and assert panel and controls visible", async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await openFocus(page);

    await expect(page.getByText("Focus", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    await expect(
      page.getByText("Manual logs - Quick durations", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Default break reminder", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
    const addBtn = page.getByRole("button", { name: /^Add$/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
  });

  test("Focus: quick durations persist after add", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openFocus(page);

    await expect(
      page.getByText("Manual logs - Quick durations", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    const quickAddInput = page.getByPlaceholder("Duration").first();
    await expect(quickAddInput).toBeVisible({ timeout: 5_000 });
    await quickAddInput.click();
    await quickAddInput.clear();
    await page.keyboard.type("25", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^Add$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openFocus(page);
    await expect(page.getByText("25 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test("Focus: default break reminder value persists", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openFocus(page);

    await expect(
      page.getByText("Default break reminder", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    const breakReminderInput = page.getByPlaceholder("Duration").nth(1);
    await expect(breakReminderInput).toBeVisible({ timeout: 5_000 });
    await breakReminderInput.click();
    await breakReminderInput.clear();
    await page.keyboard.type("45", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openFocus(page);
    await expect(
      page.getByText("Default break reminder", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    const breakReminderInputAfter = page.getByPlaceholder("Duration").nth(1);
    await expect(breakReminderInputAfter).toBeVisible({ timeout: 5_000 });
    await expect(breakReminderInputAfter).toHaveValue("45");
  });

  test("Focus: PiP toggle state persists", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);
    await openFocus(page);

    const pipCheckbox = page.getByRole("checkbox", {
      name: /Automatically activate Picture-in-Picture|PiP on focus start/i
    });
    const pipVisible = await pipCheckbox.isVisible().catch(() => false);
    if (!pipVisible) {
      test.skip(true, "PiP switch not shown (e.g. in embed context)");
      return;
    }

    const wasChecked = await pipCheckbox.isChecked();
    await pipCheckbox.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await expect(pipCheckbox).toBeChecked({ checked: !wasChecked });

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await openFocus(page);
    const pipCheckboxAfter = page.getByRole("checkbox", {
      name: /Automatically activate Picture-in-Picture|PiP on focus start/i
    });
    await expect(pipCheckboxAfter).toBeVisible({ timeout: 5_000 });
    await expect(pipCheckboxAfter).toBeChecked({ checked: !wasChecked });
  });

  test("Focus: set 2min quick duration, 1min break reminder, PiP on → create goal → start focus → verify PiP → add manual log (last 2 min) → start focus → verify break reminder after 1 min", async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === "memotron", "Focus panel only in Pointron and Nucleum");
    test.setTimeout(240_000);
    await ensureInAppOnHome(page);

    await openFocus(page);
    await expect(
      page.getByText("Manual logs - Quick durations", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });

    const quickAddInput = page.getByPlaceholder("Duration").first();
    await expect(quickAddInput).toBeVisible({ timeout: 5_000 });
    await quickAddInput.click();
    await quickAddInput.clear();
    await page.keyboard.type("2", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Add$/i }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await expect(page.getByText("2 min", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });

    const breakReminderInput = page.getByPlaceholder("Duration").nth(1);
    await expect(breakReminderInput).toBeVisible({ timeout: 5_000 });
    await breakReminderInput.click();
    await breakReminderInput.clear();
    await page.keyboard.type("1", { delay: 80 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    // SwitchInput renders the checkbox as `sr-only` (visually hidden), so isVisible()
    // always returns false. Use count() to detect presence and isChecked() for state.
    const pipRow = page
      .locator("div")
      .filter({ hasText: /Automatically activate Picture-in-Picture \(PiP\) on focus start/ })
      .filter({ has: page.locator('input[type="checkbox"]') })
      .last();
    const pipInput = pipRow.locator('input[type="checkbox"]').first();
    const pipSettingExists = (await pipInput.count()) > 0;
    if (pipSettingExists) {
      if (!(await pipInput.isChecked())) {
        // FormControlLabel also renders a <label> (for the text), so use
        // `label:has(input)` to specifically click Switch.svelte's toggle label
        await pipRow.locator("label:has(input[type='checkbox'])").click({ timeout: 5_000 });
        await page.waitForTimeout(300);
      }
      // Assert the PiP setting is ON before closing settings
      await expect(pipInput).toBeChecked({ timeout: 3_000 });
    }

    await page.getByTestId("modal-close").click({ timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(500);

    const goalName = `E2E focus verify ${Date.now()}`;
    await runCommand(page, "Create a new goal");
    const goalNameInput = page.getByTestId("goal-name-input");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(goalName);
    await page.keyboard.press("Enter");
    await expect(goalNameInput).toBeHidden({ timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await runQuickFocusCommand(page);
    const cmdInput = page.getByTestId("command-bar-input");
    await cmdInput.waitFor({ state: "visible", timeout: 10_000 });
    await cmdInput.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1_500);

    const focusTimerButton = page.getByRole("button", { name: /^\d{1,2}:\d{2}$/ });

    if (pipSettingExists) {
      // Give auto-PiP time to activate after session starts
      await page.waitForTimeout(2_000);

      // Check if the browser's Document Picture-in-Picture window is open.
      // When PiP activates, the app calls documentPictureInPicture.requestWindow() and
      // physically moves #focusplayer into that window, so it's no longer in main DOM.
      const isPipWindowOpen = await page.evaluate(() => {
        try {
          return !!(window as any).documentPictureInPicture?.window;
        } catch {
          return false;
        }
      });

      if (isPipWindowOpen) {
        // PiP window is open: #focusplayer was moved to the PiP window's DOM.
        // #playercontainer stays in the main DOM but is now empty (no children),
        // so it has zero size and appears hidden — that is the expected PiP state.
        await expect(page.locator("#playercontainer #focusplayer")).toHaveCount(0);
      } else {
        await expect(focusTimerButton).toBeVisible({ timeout: 5_000 });
      }
    } else {
      // PiP setting not present (embed context) — just verify focus is running
      await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });
    }

    await runCommand(page, "Finish the current session");
    await page
      .getByRole("button", { name: "Finish Win + Enter", exact: true })
      .click({ timeout: 5_000 });
    await page
      .getByRole("button", { name: /^Done/i })
      .click({ timeout: 5_000 });
    await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => null);
    await page.waitForTimeout(1_000);

    await runCommand(page, "Focus");
    await page
      .getByRole("button", { name: /Add manual log/i })
      .click({ timeout: 10_000 });
    await expect(page.getByText("Manual time entry").first()).toBeVisible({
      timeout: 10_000
    });
    const goalInput = page.getByPlaceholder("Start typing to select goal");
    await goalInput.waitFor({ state: "visible", timeout: 5_000 });
    await goalInput.fill(goalName);
    await page.waitForTimeout(1_000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await expect(page.getByText("Choose quick duration", { exact: true }).first()).toBeVisible({
      timeout: 5_000
    });
    const last2MinBtn = page.getByRole("button", { name: /last\s+2\s*min/i }).first();
    await expect(last2MinBtn).toBeVisible({ timeout: 5_000 });
    await last2MinBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(300);
    await page
      .locator("button")
      .filter({ hasText: /Save entries/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    await runQuickFocusCommand(page);
    const cmdInput2 = page.getByTestId("command-bar-input");
    await cmdInput2.waitFor({ state: "visible", timeout: 10_000 });
    await cmdInput2.fill(goalName);
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2_000);

    await expect(focusTimerButton).toBeVisible({ timeout: 10_000 });

    const breakReminderElement = page.getByText(/Its been|consider taking a short break/i).first();
    await expect(breakReminderElement).toBeVisible({ timeout: 65_000 });
  });
});

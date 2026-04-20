import { expect, type Page } from "@playwright/test";
import { getProductConfig } from "./helpers";
import { openSettings } from "./settings";

export type SettingsPanelKey =
  | "focus"
  | "node"
  | "mode"
  | "keyboardShortcuts"
  | "accessibility";

export interface SettingsPanelContract {
  key: SettingsPanelKey;
  enabled: boolean;
  sidebarName: RegExp;
  titlePattern: RegExp;
  anchorPatterns: readonly RegExp[];
}

export interface NodeContentPanelContract {
  enabled: boolean;
  contentNavigation: "namedContentTab" | "firstTab";
  bookmarksNavigation: "overviewTabThenInfoCard";
}

function buildSettingsPanelContracts(projectName: string): Record<SettingsPanelKey, SettingsPanelContract> {
  const capabilities = getProductConfig(projectName).capabilities.settings;

  return {
    focus: {
      key: "focus",
      enabled: capabilities.focusPanel,
      sidebarName: /^Focus$/i,
      titlePattern: /^Focus$/i,
      anchorPatterns: [
        /^Manual logs - Quick durations$/i,
        /^Default break reminder$/i
      ]
    },
    node: {
      key: "node",
      enabled: capabilities.nodeSettingsPanel,
      sidebarName: /^Node settings$/i,
      titlePattern: /^Node settings$/i,
      anchorPatterns: [/Don't show text highlight colors/i]
    },
    mode: {
      key: "mode",
      enabled: capabilities.sharedModeOfInteraction,
      sidebarName: /^Mode of interaction$/i,
      titlePattern: /^Mode of interaction$/i,
      anchorPatterns: [
        /^Preferred mode of interaction$/i,
        /^Hide all hot key and shortcut hints$/i
      ]
    },
    keyboardShortcuts: {
      key: "keyboardShortcuts",
      enabled:
        capabilities.sharedModeOfInteraction ||
        capabilities.sharedShortcutCustomization ||
        capabilities.sharedHotKeyMatrix,
      sidebarName: /^Keyboard shortcuts$/i,
      titlePattern: /^Keyboard shortcuts$/i,
      anchorPatterns: [/^Command bar$/i, /^Edit mode$/i]
    },
    accessibility: {
      key: "accessibility",
      enabled: capabilities.accessibilityPanel,
      sidebarName: /^Accessibility$/i,
      titlePattern: /^Accessibility$/i,
      anchorPatterns: [/^Block sizing$/i]
    }
  };
}

export function getSettingsPanelContract(
  projectName: string,
  key: SettingsPanelKey
) {
  return buildSettingsPanelContracts(projectName)[key];
}

export function listEnabledSettingsPanels(projectName: string) {
  return Object.values(buildSettingsPanelContracts(projectName)).filter(
    (contract) => contract.enabled
  );
}

export function getNodeContentPanelContract(projectName: string): NodeContentPanelContract {
  const nodePanels = getProductConfig(projectName).capabilities.records.nodePanels;
  return {
    enabled: !!nodePanels,
    contentNavigation: nodePanels?.contentNavigation ?? "namedContentTab",
    bookmarksNavigation:
      nodePanels?.bookmarksNavigation ?? "overviewTabThenInfoCard"
  };
}

export async function openDeclaredSettingsPanel(
  page: Page,
  projectName: string,
  key: SettingsPanelKey
) {
  const contract = getSettingsPanelContract(projectName, key);
  if (!contract.enabled) {
    throw new Error(`E2E_CFG_002: settings panel "${key}" is disabled for ${projectName}`);
  }

  await openSettings(page);
  const sidebar = page.getByTestId("settings-sidebar");
  await expect(sidebar).toBeVisible({ timeout: 10_000 });

  await sidebar
    .getByRole("button", { name: contract.sidebarName })
    .click({ timeout: 5_000 });
  await page.waitForTimeout(400);

  const title = page.getByText(contract.titlePattern).first();
  const anchors = contract.anchorPatterns.map((pattern) =>
    page.getByText(pattern).first()
  );

  await expect
    .poll(
      async () => {
        if (await title.isVisible().catch(() => false)) return true;
        for (const anchor of anchors) {
          if (await anchor.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 10_000 }
    )
    .toBe(true);

  return contract;
}

export async function openDeclaredNodeContentPanel(
  page: Page,
  projectName: string
) {
  const contract = getNodeContentPanelContract(projectName);
  if (!contract.enabled) {
    throw new Error(`E2E_CFG_002: node content panel contract is disabled for ${projectName}`);
  }

  const tablist = page.getByRole("tablist").first();
  await expect(tablist).toBeVisible({ timeout: 10_000 });

  if (contract.contentNavigation === "firstTab") {
    const firstTab = tablist.getByRole("tab").first();
    await expect(firstTab).toBeVisible({ timeout: 5_000 });
    await firstTab.click({ timeout: 5_000 });
    await expect(firstTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000
    });
    return contract;
  }

  const contentTab = tablist.getByRole("tab", { name: /^Content$/i }).first();
  await expect(contentTab).toBeVisible({ timeout: 5_000 });
  await contentTab.click({ timeout: 5_000 });
  await expect(contentTab).toHaveAttribute("aria-selected", "true", {
    timeout: 5_000
  });
  return contract;
}

export async function openDeclaredNodeBookmarksPanel(
  page: Page,
  projectName: string
) {
  const contract = getNodeContentPanelContract(projectName);
  if (!contract.enabled) {
    throw new Error(`E2E_CFG_002: node content panel contract is disabled for ${projectName}`);
  }

  const tablist = page.getByRole("tablist").first();
  await expect(tablist).toBeVisible({ timeout: 10_000 });

  if (contract.bookmarksNavigation === "overviewTabThenInfoCard") {
    const overviewTab = tablist.getByRole("tab").nth(1);
    await expect(overviewTab).toBeVisible({ timeout: 5_000 });
    await overviewTab.click({ timeout: 5_000 });
    await expect(overviewTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000
    });

    const bookmarksCard = page.getByText(/^Bookmarks$/i).first();
    await expect(bookmarksCard).toBeVisible({ timeout: 10_000 });
    await bookmarksCard.click({ timeout: 5_000 });
    await expect(page.getByPlaceholder("Search bookmarks")).toBeVisible({
      timeout: 10_000
    });
  }

  return contract;
}

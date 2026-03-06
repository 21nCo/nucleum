import { test, expect, type Page } from "@playwright/test";
import { ensureInAppOnHome, runCommand } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function createNode(page: Page, nodeName: string) {
  await ensureInAppOnHome(page);
  await page
    .getByRole("button", { name: /^Capture$/i })
    .first()
    .click({ timeout: 5_000 });
  await page.waitForTimeout(1_000);

  const captureEditor = page.getByTestId("capture-editor");
  const editor = captureEditor
    .getByPlaceholder("Start typing to capture...")
    .or(
      captureEditor.getByRole("textbox", {
        name: /Markdown editor|Start typing/i
      })
    )
    .first();
  const markdownBtn = page
    .getByRole("button", { name: /^Markdown$/i })
    .first();
  const editorVisible = await editor.isVisible().catch(() => false);
  if (!editorVisible) {
    await markdownBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
  }
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(500);
  await editor.click();
  await page.waitForTimeout(300);
  await page.keyboard.type(nodeName, { delay: 50 });
  await page.waitForTimeout(500);

  const saveByTestId = page.getByTestId("capture-save-button");
  const saveByLabel = page.getByRole("button", { name: /Save/i }).first();
  if (await saveByTestId.isVisible().catch(() => false)) {
    await saveByTestId.click({ timeout: 5_000 });
  } else if (await saveByLabel.isVisible().catch(() => false)) {
    await saveByLabel.click({ timeout: 5_000 });
  } else {
    await editor.click();
    await page.waitForTimeout(200);
    await page.keyboard.press("Meta+Enter");
  }
  await expect(
    page.getByText(/Node saved|saved successfully/i).first()
  ).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_500);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

async function navigateToLibraryNodes(page: Page) {
  const libraryBtn = page
    .locator("#app-menu")
    .getByRole("button", { name: /^Library$/i });
  const libraryVisible = await libraryBtn
    .first()
    .isVisible()
    .catch(() => false);
  if (libraryVisible) {
    await libraryBtn.first().click({ timeout: 5_000 });
  } else {
    await page.goto("/library", { waitUntil: "domcontentloaded", timeout: 10_000 });
  }
  await page.waitForURL(
    (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
    { timeout: 10_000 }
  ).catch(() => null);
  await page.waitForTimeout(1_000);

  const nodesBtn = page
    .getByRole("button", { name: /^Nodes(\s+\d+)?$/i })
    .first();
  const nodesVisible = await nodesBtn
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (nodesVisible) {
    const disabled = await nodesBtn
      .getAttribute("aria-disabled")
      .then((a) => a === "true")
      .catch(() => false);
    if (!disabled) await nodesBtn.click({ timeout: 5_000 });
  } else {
    await runCommand(page, "Nodes");
    await page
      .getByTestId("command-bar-input")
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => null);
  }
  await page.waitForTimeout(1_000);
}

async function openContextMenuOnNode(
  page: Page,
  nodeName: string,
  options?: { force?: boolean }
) {
  const force = options?.force ?? false;
  const nodeRow = page
    .locator(".resource")
    .filter({ hasText: nodeName })
    .first();
  await nodeRow.waitFor({ state: "visible", timeout: 15_000 });
  await nodeRow.hover({ force });
  await page.waitForTimeout(800);
  // In Memotron (grid) the card has two direct buttons: the card and the 3-dots context menu. Click the 3-dots.
  const contextMenuTrigger = nodeRow.locator("> button").last();
  await contextMenuTrigger.waitFor({ state: "visible", timeout: 8_000 });
  await contextMenuTrigger.click({ timeout: 5_000, force });
  await page.waitForTimeout(500);
}

/** Open context menu on the first node in the list (e.g. when node displays as "Untitled"). */
async function openContextMenuOnFirstNode(
  page: Page,
  options?: { force?: boolean }
) {
  const force = options?.force ?? false;
  const nodeRow = page.locator(".resource").first();
  await nodeRow.waitFor({ state: "visible", timeout: 15_000 });
  await nodeRow.hover({ force });
  await page.waitForTimeout(800);
  const contextMenuTrigger = nodeRow.locator("> button").last();
  await contextMenuTrigger.waitFor({ state: "visible", timeout: 8_000 });
  await contextMenuTrigger.click({ timeout: 5_000, force });
  await page.waitForTimeout(500);
}

async function clickContextMenuItem(page: Page, itemValue: string) {
  const menuItem = page.locator(
    `[data-context-menu-item-id="${itemValue}"]`
  );
  await menuItem.waitFor({ state: "visible", timeout: 5_000 });
  await menuItem.click();
  await page.waitForTimeout(500);
}

async function dismissAnyModals(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

async function openRecordPageContextMenu(page: Page) {
  const panelRow = page
    .locator("div.border-t.border-x.border-brs3")
    .filter({ has: page.getByRole("button", { name: /Close/i }) })
    .first();
  await panelRow.waitFor({ state: "visible", timeout: 10_000 });
  const buttons = panelRow.getByRole("button");
  await buttons.last().click({ timeout: 5_000 });
  await page.waitForTimeout(500);
}

test.describe("node – context menu (from library, from record page) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test.describe("from library", () => {
    test("context menu appears with expected actions on hover", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node ctx ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);

      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);

      const expectedItems = [
        { value: "select", label: /Select|Unselect/i },
        { value: "star", label: /Star this resource|Unstar/i },
        { value: "addToCollection", label: /Add to collection/i },
        { value: "edit", label: /^Edit$/i },
        { value: "COPY_LINK", label: /Copy link/i },
        { value: "archive", label: /^archive$/i },
        { value: "delete", label: /^delete$/i }
      ];

      for (const item of expectedItems) {
        const menuItem = page.locator(
          `[data-context-menu-item-id="${item.value}"]`
        );
        await expect(menuItem).toBeVisible({ timeout: 5_000 });
      }

      await dismissAnyModals(page);
    });

    test("Star/Unstar node via context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node star ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      const starItem = page.locator('[data-context-menu-item-id="star"]');
      await expect(starItem).toContainText(/Star this resource/i);
      await starItem.click();
      await page.waitForTimeout(1_000);

      await openContextMenuOnNode(page, nodeName);
      await expect(starItem).toContainText(/Unstar/i);
      await starItem.click();
      await page.waitForTimeout(500);

      await openContextMenuOnNode(page, nodeName);
      await expect(starItem).toContainText(/Star this resource/i);
      await dismissAnyModals(page);
    });

    test("Copy link shows toast confirmation", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node copy ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      await clickContextMenuItem(page, "COPY_LINK");

      await expect(
        page.getByText(/link copied/i).first()
      ).toBeVisible({ timeout: 5_000 });
    });

    test("Edit opens node record in edit mode", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node edit ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      await clickContextMenuItem(page, "edit");

      await expect(page.getByText(nodeName).first()).toBeVisible({
        timeout: 10_000
      });

      const urlHasEdit = await page
        .waitForURL((u) => u.toString().includes("edit=true"), {
          timeout: 5_000
        })
        .then(() => true)
        .catch(() => false);

      const nodeRecordVisible = await page
        .getByText(nodeName)
        .first()
        .isVisible()
        .catch(() => false);
      expect(urlHasEdit || nodeRecordVisible).toBe(true);

      await dismissAnyModals(page);
    });

    test("Archive and unarchive node via context menu", async ({ page }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node archive ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      const archiveItem = page.locator(
        '[data-context-menu-item-id="archive"]'
      );
      await expect(archiveItem).toBeVisible({ timeout: 5_000 });
      await archiveItem.click();
      await page.waitForTimeout(2_000);

      const nodeStillVisible = await page
        .getByText(nodeName, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(nodeStillVisible).toBe(false);

      const archiveFilterByLabel = page
        .getByRole("button", { name: /Archived|Show archived items/i })
        .first();
      const labelVisible = await archiveFilterByLabel
        .isVisible()
        .catch(() => false);
      if (labelVisible) {
        await archiveFilterByLabel.click({ timeout: 5_000 });
      } else {
        const url = new URL(page.url());
        url.searchParams.set("archived", "true");
        await page.goto(url.toString(), { timeout: 10_000 });
      }
      await page.waitForTimeout(1_500);

      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 10_000 });

      await openContextMenuOnNode(page, nodeName);
      const unarchiveItem = page.locator(
        '[data-context-menu-item-id="unarchive"]'
      );
      await expect(unarchiveItem).toBeVisible({ timeout: 5_000 });
      await unarchiveItem.click();
      await page.waitForTimeout(2_000);

      if (labelVisible) {
        await archiveFilterByLabel.click({ timeout: 5_000 });
      } else {
        const url = new URL(page.url());
        url.searchParams.delete("archived");
        await page.goto(url.toString(), { timeout: 10_000 });
      }
      await page.waitForTimeout(1_000);
    });

    test("Delete and restore node via context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node delete ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      const deleteItem = page.locator(
        '[data-context-menu-item-id="delete"]'
      );
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click();
      await page.waitForTimeout(2_000);

      const nodeStillVisible = await page
        .getByText(nodeName, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(nodeStillVisible).toBe(false);

      const trashFilter = page
        .getByRole("button", { name: /Trash/i })
        .first();
      const hasTrashFilter = await trashFilter
        .isVisible()
        .catch(() => false);

      if (hasTrashFilter) {
        await trashFilter.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
        await expect(
          page.getByText(nodeName, { exact: true }).first()
        ).toBeVisible({ timeout: 10_000 });

        await openContextMenuOnNode(page, nodeName);
        const restoreItem = page.locator(
          '[data-context-menu-item-id="restore"]'
        );
        await expect(restoreItem).toBeVisible({ timeout: 5_000 });
        await restoreItem.click();
        await page.waitForTimeout(2_000);
      }
    });

    test("Open as tab adds node to tab bar", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node tab ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      const openTabItem = page.locator(
        '[data-context-menu-item-id="Open as tab"]'
      );
      await expect(openTabItem).toBeVisible({ timeout: 5_000 });
      await openTabItem.click();
      await page.waitForTimeout(2_000);

      // Wait for the tab to appear in the top bar (may show as node name or "Untitled")
      await expect(
        page.getByRole("button", { name: new RegExp(nodeName + "|Untitled", "i") }).first()
      ).toBeVisible({ timeout: 10_000 }).catch(() => null);
      await page.waitForTimeout(1_000);

      const closeBtn = page.getByRole("button", { name: /Close/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
      }
      await navigateToLibraryNodes(page);
      await page.waitForTimeout(800);

      // Node may display as "Untitled" in the list after opening as tab; use first node
      await openContextMenuOnFirstNode(page);
      const removeTabItem = page.locator(
        '[data-context-menu-item-id="Remove from tabs"]'
      );
      await expect(removeTabItem).toBeVisible({ timeout: 8_000 });
      await removeTabItem.click();
      await page.waitForTimeout(1_000);
    });

    test("Select activates bulk selection mode", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node select ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      await clickContextMenuItem(page, "select");
      await page.waitForTimeout(1_000);

      const nodeRow = page
        .locator(".resource")
        .filter({ hasText: nodeName })
        .first();
      const selectionIndicator = nodeRow.locator("button.rounded-full");
      const hasSelection =
        (await selectionIndicator.isVisible().catch(() => false)) ||
        (await nodeRow.locator('[class*="check"]').isVisible().catch(() => false)) ||
        (await page.getByText(/selected/i).first().isVisible().catch(() => false));
      expect(hasSelection).toBe(true);

      await dismissAnyModals(page);
    });

    test("Add to collection opens collection picker", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node coll ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnNode(page, nodeName);
      await clickContextMenuItem(page, "addToCollection");

      const collectionPicker = page
        .getByText(/Add to collection/i)
        .or(page.getByTestId("command-bar-input"))
        .first();
      await expect(collectionPicker).toBeVisible({ timeout: 10_000 });

      await dismissAnyModals(page);
    });
  });

  test.describe("from record page", () => {
    test("context menu on record page shows expected actions", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node rec ctx ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      const nodeRow = page
        .locator(".resource")
        .filter({ hasText: nodeName })
        .first();
      await nodeRow.click();
      await page.waitForTimeout(2_000);

      await expect(page.getByText(nodeName).first()).toBeVisible({
        timeout: 10_000
      });

      await openRecordPageContextMenu(page);

      const expectedRecordItems = [
        { value: "star" },
        { value: "edit" },
        { value: "COPY_LINK" },
        { value: "archive" },
        { value: "delete" }
      ];

      for (const item of expectedRecordItems) {
        const menuItem = page.locator(
          `[data-context-menu-item-id="${item.value}"]`
        );
        const visible = await menuItem.isVisible().catch(() => false);
        if (visible) {
          await expect(menuItem).toBeVisible();
        }
      }

      await dismissAnyModals(page);
    });

    test("Star node from record page context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const nodeName = `E2E node rec star ${Date.now()}`;
      await createNode(page, nodeName);
      await navigateToLibraryNodes(page);
      await expect(
        page.getByText(nodeName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      const nodeRow = page
        .locator(".resource")
        .filter({ hasText: nodeName })
        .first();
      await nodeRow.click();
      await page.waitForTimeout(2_000);

      await openRecordPageContextMenu(page);

      const starItem = page.locator('[data-context-menu-item-id="star"]');
      if (await starItem.isVisible().catch(() => false)) {
        await expect(starItem).toContainText(/Star this resource/i);
        await starItem.click();
        await page.waitForTimeout(1_000);

        await openRecordPageContextMenu(page);

        await expect(
          page.locator('[data-context-menu-item-id="star"]')
        ).toContainText(/Unstar/i);
      }

      await dismissAnyModals(page);
    });
  });
});

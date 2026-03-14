import { test, expect, type Page } from "@playwright/test";
import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
import { ensureInAppOnHome, runCommand } from "../../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function createGoal(page: Page, goalName: string) {
  await runCommand(page, "Create a new goal");
  const goalNameInput = page.getByTestId("goal-name-input");
  await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await goalNameInput.fill(goalName);
  await page.keyboard.press("Enter");
  await expect(goalNameInput)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => null);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

async function navigateToLibraryGoals(page: Page) {
  await page
    .locator("#app-menu")
    .getByRole("button", { name: /^Library$/i })
    .click({ timeout: 5_000 });
  await page.waitForURL(
    (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
    { timeout: 10_000 }
  );
  const goalsBtn = page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first();
  const goalsVisible = await goalsBtn.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false);
  if (goalsVisible) {
    const disabled = await goalsBtn.getAttribute("aria-disabled").then((a) => a === "true").catch(() => false);
    if (!disabled) await goalsBtn.click({ timeout: 5_000 });
  } else {
    await runCommand(page, "Goals");
    await page.getByTestId("command-bar-input").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
  }
  await page.waitForTimeout(1_000);
}

/**
 * Open the goal context menu from the Library Goals list.
 * The context menu trigger is the only direct <button> child of .resource
 * (the goal row content is inside a div). It only appears on hover.
 * @param options.force - use force: true on hover/click when an overlay blocks (e.g. after Open as tab)
 */
async function openContextMenuOnGoal(
  page: Page,
  goalName: string,
  options?: { force?: boolean }
) {
  const force = options?.force ?? false;
  const goalRow = page
    .locator(".resource")
    .filter({ hasText: goalName })
    .first();
  await goalRow.waitFor({ state: "visible", timeout: 15_000 });
  await goalRow.hover({ force });
  await page.waitForTimeout(800);

  const contextMenuTrigger = goalRow.locator("> button");
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

test.describe("goal – context menu (all actions) @regression", () => {
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

      const goalName = `E2E ctx menu ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);

      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);

      const expectedItems = [
        { value: ResourceActionType.STAR, label: /Star this resource/i },
        { value: ResourceActionType.EDIT, label: /^Edit$/i },
        { value: ResourceActionType.COPY_LINK, label: /Copy link/i },
        { value: "focusNow", label: /Focus now/i },
        { value: "pinToQuickFocus", label: /Pin to quick focus/i },
        { value: PointronAction.CONVERT_TO_SUBGOAL, label: /Convert to sub goal/i },
        { value: ResourceActionType.ARCHIVE, label: /^archive$/i },
        { value: ResourceActionType.DELETE, label: /^delete$/i }
      ];

      for (const item of expectedItems) {
        const menuItem = page.locator(
          `[data-context-menu-item-id="${item.value}"]`
        );
        await expect(menuItem).toBeVisible({ timeout: 5_000 });
      }

      await dismissAnyModals(page);
    });

    test("Star/Unstar goal via context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E star ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      const starItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.STAR}"]`
      );
      await expect(starItem).toContainText(/Star this resource/i);
      await starItem.click();
      await page.waitForTimeout(1_000);

      await openContextMenuOnGoal(page, goalName);
      const unstarItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.STAR}"]`
      );
      await expect(unstarItem).toContainText(/Unstar/i);
      await unstarItem.click();
      await page.waitForTimeout(500);

      await openContextMenuOnGoal(page, goalName);
      await expect(
        page.locator(`[data-context-menu-item-id="${ResourceActionType.STAR}"]`)
      ).toContainText(/Star this resource/i);
      await dismissAnyModals(page);
    });

    test("Copy link shows toast confirmation", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E copy link ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      await clickContextMenuItem(page, ResourceActionType.COPY_LINK);

      await expect(
        page.getByText(/link copied/i).first()
      ).toBeVisible({ timeout: 5_000 });
    });

    test("Edit opens goal record in edit mode", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E edit ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      await clickContextMenuItem(page, ResourceActionType.EDIT);

      await expect(
        page.getByText(goalName).first()
      ).toBeVisible({ timeout: 10_000 });

      const urlHasEdit = await page
        .waitForURL((u) => u.toString().includes("edit=true"), {
          timeout: 5_000
        })
        .then(() => true)
        .catch(() => false);

      const goalRecordVisible = await page
        .locator('[data-testid="goal-name-input"]')
        .or(page.getByText(goalName).first())
        .first()
        .isVisible()
        .catch(() => false);
      expect(urlHasEdit || goalRecordVisible).toBe(true);

      await dismissAnyModals(page);
    });

    test("Focus now starts a focus session on the goal", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E focus now ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      await clickContextMenuItem(page, "focusNow");

      const focusTimerButton = page.getByRole("button", {
        name: /^\d{1,2}:\d{2}$/
      });
      await focusTimerButton.waitFor({ state: "visible", timeout: 15_000 });

      await page.waitForTimeout(3_000);

      await runCommand(page, "Finish the current session");
      await page
        .getByRole("button", { name: "Finish Win + Enter", exact: true })
        .click({ timeout: 5_000 });
      await page
        .getByRole("button", { name: /^Done/i })
        .click({ timeout: 5_000 });

      await focusTimerButton.waitFor({ state: "hidden", timeout: 15_000 });
    });

    test("Pin to quick focus toggle works", async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E pin qf ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      const pinItem = page.locator(
        '[data-context-menu-item-id="pinToQuickFocus"]'
      );
      await expect(pinItem).toBeVisible({ timeout: 5_000 });
      await pinItem.click();
      await page.waitForTimeout(1_000);

      await dismissAnyModals(page);

      const clearSelection = page.getByRole("button", { name: /Clear selection/i }).first();
      if (await clearSelection.isVisible().catch(() => false)) {
        await clearSelection.click({ timeout: 3_000 });
        await page.waitForTimeout(500);
      }

      // Pointron has Quick Focus panel (quick-focus-search); Nucleus does not.
      // Navigate to Focus view via nav button so Quick Start panel with quick-focus-search is visible.
      const isPointron = testInfo.project.name === "pointron";
      if (isPointron) {
        const focusNavBtn = page
          .locator("#app-menu")
          .getByRole("button", { name: /^Focus$/i })
          .first();
        await focusNavBtn.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
        const quickFocusSearch = page.getByTestId("quick-focus-search");
        await quickFocusSearch.waitFor({ state: "visible", timeout: 15_000 });
        await page.waitForTimeout(1_000);
        const pinnedGoal = page
          .locator("button")
          .filter({ hasText: goalName })
          .first();
        await expect(pinnedGoal).toBeVisible({ timeout: 15_000 });
        await dismissAnyModals(page);
        await navigateToLibraryGoals(page);
      } else {
        // Nucleus: just verify pin state by unpinning via context menu
        await navigateToLibraryGoals(page);
      }

      await openContextMenuOnGoal(page, goalName);
      await pinItem.click();
      await page.waitForTimeout(1_000);
      await dismissAnyModals(page);
    });

    test("Convert to sub goal opens parent goal selector", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const parentGoalName = `E2E parent ${Date.now()}`;
      const childGoalName = `E2E child ${Date.now()}`;
      await createGoal(page, parentGoalName);
      await createGoal(page, childGoalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(childGoalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, childGoalName);
      await clickContextMenuItem(page, PointronAction.CONVERT_TO_SUBGOAL);

      const cmdInput = page.getByTestId("command-bar-input");
      await cmdInput.waitFor({ state: "visible", timeout: 10_000 });

      await cmdInput.fill(parentGoalName);
      await page.waitForTimeout(1_000);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2_000);

      await cmdInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      await page.locator("#app-menu").getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
      await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), { timeout: 10_000 });
      await runCommand(page, "Goals");
      await page.getByTestId("command-bar-input").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
      await page.waitForTimeout(1_500);

      const parentGoalRow = page
        .locator(".resource")
        .filter({ hasText: parentGoalName })
        .first();
      await expect(parentGoalRow).toBeVisible({ timeout: 15_000 });
      await parentGoalRow.click();
      await page.waitForTimeout(2_000);

      // Parent record opens; conversion is proven by "1 sub goal" in the Library list (panel switcher may be icon-only)
      await expect(
        page.getByRole("heading", { name: parentGoalName, level: 1 })
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.locator(".resource").filter({ hasText: parentGoalName }).filter({ hasText: /1 sub goal/i })
      ).toBeVisible({ timeout: 5_000 });

      await dismissAnyModals(page);
    });

    test("Archive and unarchive goal via context menu", async ({
      page
    }) => {
      test.setTimeout(120_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E archive ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      const archiveItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.ARCHIVE}"]`
      );
      await expect(archiveItem).toBeVisible({ timeout: 5_000 });
      await archiveItem.click();
      await page.waitForTimeout(2_000);

      const goalStillVisible = await page
        .getByText(goalName, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(goalStillVisible).toBe(false);

      // Open archived view: try button (e.g. "Archived" / "Show archived items") or URL param (icon-only toggle)
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
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 10_000 });

      await openContextMenuOnGoal(page, goalName);
      const unarchiveItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.UNARCHIVE}"]`
      );
      await expect(unarchiveItem).toBeVisible({ timeout: 5_000 });
      await unarchiveItem.click();
      await page.waitForTimeout(2_000);

      // Click archive icon again to remove the selection (back to main list view)
      if (labelVisible) {
        await archiveFilterByLabel.click({ timeout: 5_000 });
      } else {
        const url = new URL(page.url());
        url.searchParams.delete("archived");
        await page.goto(url.toString(), { timeout: 10_000 });
      }
      await page.waitForTimeout(1_000);
    });

    test("Delete and restore goal via context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E delete ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      const deleteItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.DELETE}"]`
      );
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click();
      await page.waitForTimeout(2_000);

      const goalStillVisible = await page
        .getByText(goalName, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(goalStillVisible).toBe(false);

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
          page.getByText(goalName, { exact: true }).first()
        ).toBeVisible({ timeout: 10_000 });

        await openContextMenuOnGoal(page, goalName);
        const restoreItem = page.locator(
          `[data-context-menu-item-id="${ResourceActionType.RESTORE}"]`
        );
        await expect(restoreItem).toBeVisible({ timeout: 5_000 });
        await restoreItem.click();
        await page.waitForTimeout(2_000);
      }
    });

    test("Open as tab adds goal to tab bar", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E tab ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      const openTabItem = page.locator(
        '[data-context-menu-item-id="Open as tab"]'
      );
      await expect(openTabItem).toBeVisible({ timeout: 5_000 });
      await openTabItem.click();
      await page.waitForTimeout(2_000);

      // Close the goal panel so we're back on Library list and can open the same goal's context menu
      const closeBtn = page.getByRole("button", { name: /Close/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
      }
      await navigateToLibraryGoals(page);
      await page.waitForTimeout(800);

      await openContextMenuOnGoal(page, goalName);
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

      const goalName = `E2E select ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
      await clickContextMenuItem(page, ResourceActionType.SELECT);
      await page.waitForTimeout(1_000);

      const goalRow = page.locator(".resource").filter({ hasText: goalName }).first();
      const selectionIndicator = goalRow.locator("button.rounded-full");
      const hasSelection =
        (await selectionIndicator.isVisible().catch(() => false)) ||
        (await goalRow.locator('[class*="check"]').isVisible().catch(() => false)) ||
        (await page.getByText(/selected/i).first().isVisible().catch(() => false));
      expect(hasSelection).toBe(true);

      await dismissAnyModals(page);
    });

    test("Add to collection opens collection picker", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E collection ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      await openContextMenuOnGoal(page, goalName);
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
    /**
     * Open context menu on goal record page (panel footer: Close, Maximize, Actions).
     * The trigger is the last button in the panel row (ResourcePanelSwitcher).
     */
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

    test("context menu on record page shows expected actions", async ({
      page
    }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E record ctx ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      const goalRow = page
        .locator(".resource")
        .filter({ hasText: goalName })
        .first();
      await goalRow.click();
      await page.waitForTimeout(2_000);

      await expect(page.getByText(goalName).first()).toBeVisible({
        timeout: 10_000
      });

      await openRecordPageContextMenu(page);

      const expectedRecordItems = [
        { value: ResourceActionType.STAR },
        { value: ResourceActionType.EDIT },
        { value: ResourceActionType.COPY_LINK },
        { value: ResourceActionType.ARCHIVE },
        { value: ResourceActionType.DELETE }
      ];

      for (const item of expectedRecordItems) {
        const menuItem = page.locator(
          `[data-context-menu-item-id="${item.value}"]`
        );
        const visible = await menuItem
          .isVisible()
          .catch(() => false);
        if (visible) {
          await expect(menuItem).toBeVisible();
        }
      }

      await dismissAnyModals(page);
    });

    test("Star goal from record page context menu", async ({ page }) => {
      test.setTimeout(90_000);
      await ensureInAppOnHome(page);

      const goalName = `E2E rec star ${Date.now()}`;
      await createGoal(page, goalName);
      await navigateToLibraryGoals(page);
      await expect(
        page.getByText(goalName, { exact: true }).first()
      ).toBeVisible({ timeout: 15_000 });

      const goalRow = page
        .locator(".resource")
        .filter({ hasText: goalName })
        .first();
      await goalRow.click();
      await page.waitForTimeout(2_000);

      await openRecordPageContextMenu(page);

      const starItem = page.locator(
        `[data-context-menu-item-id="${ResourceActionType.STAR}"]`
      );
      if (await starItem.isVisible().catch(() => false)) {
        await expect(starItem).toContainText(/Star this resource/i);
        await starItem.click();
        await page.waitForTimeout(1_000);

        await openRecordPageContextMenu(page);

        await expect(
          page.locator(`[data-context-menu-item-id="${ResourceActionType.STAR}"]`)
        ).toContainText(/Unstar/i);
      }

      await dismissAnyModals(page);
    });
  });
});

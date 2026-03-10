import { expect, test, type Page } from "@playwright/test";
import { nucleusProductConfig } from "../../config/nucleus-product.config";
import { pointronProductConfig } from "../../config/pointron-product.config";
import { memotronProductConfig } from "../../config/memotron-product.config";

export function getProductConfig(projectName: string) {
  if (projectName === "pointron") return pointronProductConfig;
  if (projectName === "memotron") return memotronProductConfig;
  return nucleusProductConfig;
}

function resolveProductConfig() {
  try {
    return getProductConfig(test.info().project.name);
  } catch {
    return nucleusProductConfig;
  }
}

export async function ensureInAppOnHome(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const clickContinueOfflineIfVisible = async () => {
    const continueOfflineMain = page
      .getByRole("button", { name: /Continue (using )?offline/i })
      .filter({ hasText: /Single device|free forever|No signup/i })
      .first();
    const continueOfflineAny = page.getByRole("button", {
      name: /Continue (using )?offline/i
    }).first();
    const pathname = new URL(page.url()).pathname;
    const waitMs =
      pathname === "/signup" || pathname === "/account/login" ? 10_000 : 3_000;
    let target = continueOfflineMain;
    try {
      await continueOfflineMain.waitFor({ state: "visible", timeout: waitMs });
    } catch {
      try {
        await continueOfflineAny.waitFor({ state: "visible", timeout: 2_000 });
        target = continueOfflineAny;
      } catch {
        return false;
      }
    }
    const beforePath = new URL(page.url()).pathname;
    await target.click({ timeout: 5_000, force: true }).catch(() => null);
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    const progressed = await page
      .waitForURL(
        (u) => {
          const p = new URL(u).pathname;
          return p !== "/signup" && p !== "/account/login";
        },
        { timeout: 8_000 }
      )
      .then(() => true)
      .catch(() => false);
    return progressed || new URL(page.url()).pathname !== beforePath;
  };

  for (let i = 0; i < 4; i += 1) {
    const handled = await clickContinueOfflineIfVisible();
    if (!handled) break;
  }
  for (let i = 0; i < 3; i += 1) {
    const handled = await clickContinueOfflineIfVisible();
    if (!handled) break;
    await page.waitForLoadState("domcontentloaded").catch(() => null);
  }

  const productConfig = resolveProductConfig();
  await page.goto(productConfig.homePath, { waitUntil: "domcontentloaded" });
  await page
    .waitForURL(
      (u) => {
        const p = new URL(u).pathname;
        const home = `/${productConfig.homePath}`;
        return p === home || p.startsWith(`${home}/`);
      },
      { timeout: 10_000 }
    )
    .catch(() => null);

  for (let i = 0; i < 3; i += 1) {
    const handled = await clickContinueOfflineIfVisible();
    if (!handled) break;
    await page.waitForLoadState("domcontentloaded").catch(() => null);
  }

  const navMarkers = [
    ...productConfig.appMenuNavLabels.map((label) =>
      page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()
    ),
    page.getByRole("button", { name: "Today" }).first()
  ];
  await expect
    .poll(
      async () => {
        for (const marker of navMarkers) {
          if (await marker.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 25_000 }
    )
    .toBe(true);
}

/**
 * Open command bar, type the command label, press Enter.
 */
export async function runCommand(page: Page, commandLabel: string) {
  const cmdButton = page.getByRole("button", { name: /command bar/i });
  await cmdButton.click({ timeout: 5_000 });
  const cmdInput = page.getByTestId("command-bar-input");
  await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
  await cmdInput.fill(commandLabel);
  await page.keyboard.press("Enter");
}

/**
 * Run "Quick focus" command. Typing "Quick focus" matches two commands; the first is
 * "Pin a goal to quick focus". So we press ArrowDown once to select "Quick focus", then Enter.
 */
export async function runQuickFocusCommand(page: Page) {
  const cmdButton = page.getByRole("button", { name: /command bar/i });
  await cmdButton.click({ timeout: 5_000 });
  const cmdInput = page.getByTestId("command-bar-input");
  await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
  await cmdInput.fill("Quick focus");
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
}

/** Library tab label for bulk editor tests (matches button name with optional count). */
export const LibraryTab = {
  Nodes: /^Nodes(\s+\d+)?$/i,
  Collections: /^Collections(\s+\d+)?$/i,
  Goals: /^(Goals|Objectives)(\s+\d+)?$/i,
  Tasks: /^Tasks(\s+\d+)?$/i
} as const;

/**
 * Open Library and switch to the given tab (Nodes, Collections, Goals, or Tasks).
 * Assumes we're already in the app (e.g. after ensureInAppOnHome).
 */
export async function openLibraryAndTab(
  page: Page,
  tabName: RegExp
): Promise<void> {
  await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
  await page.waitForURL(
    (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
    { timeout: 10_000 }
  );
  const tabButton = page.getByRole("button", { name: tabName }).first();
  await tabButton.waitFor({ state: "visible", timeout: 10_000 });
  await tabButton.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
}

/**
 * Create two collections via command bar so bulk editor tests have data to select.
 * Assumes ensureInAppOnHome was already called.
 */
export async function createTwoCollections(page: Page): Promise<void> {
  const createCollectionTitle = page.getByText("Create collection", {
    exact: true
  });
  for (let i = 1; i <= 2; i++) {
    await runCommand(page, "Create a new collection");
    const titleInput = page.getByPlaceholder("Name of the collection");
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.fill(`E2E bulk collection ${i} ${Date.now()}`);
    await page.waitForTimeout(300);
    const modal = page.locator("#collection_create");
    const saveBtn = modal.getByRole("button", { name: /Save.*Enter/i });
    await saveBtn.click({ timeout: 5_000 });
    await createCollectionTitle.waitFor({ state: "hidden", timeout: 10_000 });
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
}

/**
 * Create two goals via command bar so bulk editor tests have data to select.
 * Assumes ensureInAppOnHome was already called.
 */
export async function createTwoGoals(page: Page): Promise<void> {
  const goalNameInput = page.getByTestId("goal-name-input");
  for (let i = 1; i <= 2; i++) {
    await runCommand(page, "Create a new goal");
    await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await goalNameInput.fill(`E2E bulk goal ${i} ${Date.now()}`);
    await page.keyboard.press("Enter");
    await goalNameInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

/**
 * Create two tasks via command bar so bulk editor tests have data to select.
 * Assumes ensureInAppOnHome was already called.
 */
export async function createTwoTasks(page: Page): Promise<void> {
  const taskNameInput = page.getByTestId("task-name-input");
  for (let i = 1; i <= 2; i++) {
    await runCommand(page, "Create a new task");
    await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await taskNameInput.fill(`E2E bulk task ${i} ${Date.now()}`);
    await page.keyboard.press("Enter");
    await taskNameInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(500);
  }
}

/**
 * Create two nodes via Capture so bulk editor tests have data to select.
 * Opens Capture, types in the editor, clicks save, then closes Capture to return to calendar.
 * Assumes ensureInAppOnHome was already called.
 */
export async function createTwoNodesViaCapture(page: Page): Promise<void> {
  for (let i = 1; i <= 2; i++) {
    await runCommand(page, "Capture");
    const editor = page.getByTestId("capture-editor");
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(`E2E bulk node ${i} ${Date.now()}`, { delay: 30 });
    await page.waitForTimeout(300);
    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }));
    await saveBtn.first().click({ timeout: 10_000 });
    await page.waitForTimeout(1_500);
    const closeBtn = page.getByRole("button", { name: "Close" });
    await closeBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(500);
}

/**
 * Perform drag selection so that at least the first two thumbnails in the container
 * are selected. Uses the same logic as the app: mousedown in empty space, drag to
 * cover elements with id^='thumbnail-', mouseup.
 * @param page - Playwright page
 * @param containerId - id of the container (e.g. 'records-container' or 'task-library')
 */
export async function dragSelectFirstTwoThumbnails(
  page: Page,
  containerId: string
): Promise<void> {
  const container = page.locator(`#${containerId}`);
  await container.waitFor({ state: "visible", timeout: 15_000 });
  const thumbnails = container.locator('div[id^="thumbnail-"]');
  await expect(thumbnails.first()).toBeVisible({ timeout: 20_000 });
  const count = await thumbnails.count();
  if (count < 2) {
    throw new Error(
      `Bulk editor test needs at least 2 thumbnails in #${containerId}, found ${count}`
    );
  }
  await thumbnails.nth(0).scrollIntoViewIfNeeded();
  await thumbnails.nth(1).scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const containerBox = await container.boundingBox();
  const box1 = await thumbnails.nth(0).boundingBox();
  const box2 = await thumbnails.nth(1).boundingBox();
  if (!containerBox || !box1 || !box2) {
    throw new Error("Could not get bounding boxes for container or thumbnails");
  }
  const minX = Math.min(box1.x, box2.x);
  const minY = Math.min(box1.y, box2.y);
  const maxRight = Math.max(box1.x + box1.width, box2.x + box2.width);
  const maxBottom = Math.max(box1.y + box1.height, box2.y + box2.height);
  const startX = Math.max(containerBox.x + 5, minX - 20);
  const startY = Math.max(containerBox.y + 5, minY - 10);
  const endX = maxRight + 20;
  const endY = maxBottom + 15;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/**
 * Select the first two items via the 3-dots context menu - "Select" on each,
 * so the bulk edit bar (down bar with Star, Archive, Delete, etc.) appears.
 * @param page - Playwright page
 * @param containerId - id of the container (e.g. 'records-container' or 'task-library')
 */
export async function selectFirstTwoViaContextMenu(
  page: Page,
  containerId: string
): Promise<void> {
  const container = page.locator(`#${containerId}`);
  await container.waitFor({ state: "visible", timeout: 15_000 });
  const thumbnails = container.locator('div[id^="thumbnail-"]');
  await expect(thumbnails.first()).toBeVisible({ timeout: 20_000 });
  const count = await thumbnails.count();
  if (count < 2) {
    throw new Error(
      `Bulk editor test needs at least 2 thumbnails in #${containerId}, found ${count}`
    );
  }
  for (const index of [0, 1]) {
    const thumb = thumbnails.nth(index);
    await thumb.scrollIntoViewIfNeeded();
    await thumb.hover();
    await page.waitForTimeout(250);
    // 3-dots trigger: inner button (ContextMenuAction) opens the menu; outer has data-testid
    const triggerWrapper = thumb.getByTestId("thumbnail-context-menu-trigger");
    await triggerWrapper.locator("button").first().click({ timeout: 5_000 });
    await page.getByRole("button", { name: /^Select$/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
}

/**
 * Locator for the bulk edit bar (top nav bar showing "Selected: N ..." and action buttons).
 * Use this to scope button clicks so we hit the bar's Star/Archive/Delete/etc., not similar
 * buttons on cards elsewhere on the page.
 */
export function getBulkEditBar(page: Page) {
  return page.getByTestId("bulk-edit-bar");
}

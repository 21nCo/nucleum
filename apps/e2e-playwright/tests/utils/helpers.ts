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

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

export const goalResourcePattern = /^(Goals|Objectives)(\s+\d+)?$/i;

export function resolveGoalCommandLabel() {
  try {
    return test.info().project.name === "nucleum" ? "Objectives" : "Goals";
  } catch {
    return "Goals";
  }
}

/**
 * Ensure we're in the app and on the home (calendar), with app nav visible.
 * Uses saved auth session (storageState): waits for redirect, or if still on post-login screen (e.g. /signup) clicks "Continue offline".
 * No email/password in tests — run e2e:save-email-auth per project (saves after login success, before "Continue offline").
 * Waits for any product's nav label (Focus, Capture, Calendar, Overview, Library) for nucleum, pointron, and memotron.
 */
export async function ensureInAppOnHome(page: Page) {
  const debug = (message: string) => {
    console.log(`[ensureInAppOnHome] ${message}`);
  };
  const safeGoto = async (url: string) => {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (err) {
      const message = (err as Error).message || "";
      if (!/ERR_CONNECTION_REFUSED/i.test(message)) throw err;
      await page.waitForTimeout(1_000);
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
  };

  await safeGoto("/");
  await page.waitForLoadState("domcontentloaded");
  const setOfflineSessionFallback = async () => {
    debug(`setting offlineSessionId fallback on ${page.url()}`);
    await page.evaluate(() => {
      const key = "offlineSessionId";
      const value =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, value);
    });
  };
  const goHomeWithOfflineSessionFallback = async (reason: string) => {
    debug(`${reason} on ${page.url()}, using offline-session fallback`);
    await setOfflineSessionFallback();
    await safeGoto(`/${resolveProductConfig().homePath}`);
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    return true;
  };
  const loginSignupAtStart = page.getByRole("button", { name: /Login\/Signup/i }).first();
  if (await loginSignupAtStart.isVisible().catch(() => false)) {
    await goHomeWithOfflineSessionFallback("login/signup shell visible at start");
  }
  const continueOfflineAtStart = page.getByRole("button", { name: /Continue (using )?offline/i }).first();
  if (await continueOfflineAtStart.isVisible().catch(() => false)) {
    await goHomeWithOfflineSessionFallback("continue offline visible at start");
  }

  // Saved session: wait for app to redirect past auth. If we're already on an auth entry page,
  // don't burn the full timeout before trying the offline path.
  const pathAtStart = new URL(page.url()).pathname;
  const leftAuthPage =
    pathAtStart !== "/" && pathAtStart !== "/signup" && pathAtStart !== "/account/login"
      ? true
      : pathAtStart === "/signup" || pathAtStart === "/account/login"
        ? false
        : await page
            .waitForURL(
              (u) => {
                const p = new URL(u).pathname;
                return p !== "/" && p !== "/signup" && p !== "/account/login";
              },
            { timeout: 7_000, waitUntil: "domcontentloaded" }
            )
            .then(() => true)
            .catch(() => false);

  const clickContinueOfflineIfVisible = async (): Promise<boolean> => {
    const pathname = new URL(page.url()).pathname;
    const productConfig = resolveProductConfig();
    const home = `/${productConfig.homePath}`;
    if (pathname === home || pathname.startsWith(`${home}/`)) {
      return false;
    }
    const loginSignupBtn = page.getByRole("button", { name: /Login\/Signup/i }).first();
    if (await loginSignupBtn.isVisible().catch(() => false)) {
      return await goHomeWithOfflineSessionFallback("login/signup shell visible");
    }
    if (pathname === "/") {
      const btn = page.getByRole("button", { name: /Continue (using )?offline/i }).first();
      try {
        await btn.waitFor({ state: "visible", timeout: 5_000 });
      } catch {
        if (await loginSignupBtn.isVisible().catch(() => false)) {
          return await goHomeWithOfflineSessionFallback("login/signup shell visible");
        }
        return false;
      }
      return await goHomeWithOfflineSessionFallback("continue offline visible");
    }
    if (pathname === "/account/login") {
      debug("redirecting /account/login -> /signup before offline flow");
      await safeGoto("/signup");
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }
    const continueOfflineBtn = page.getByRole("button", { name: /Continue (using )?offline/i }).first();
    const currentPathname = new URL(page.url()).pathname;
    try {
      await continueOfflineBtn.waitFor({
        state: "visible",
        timeout: currentPathname === "/signup" ? 10_000 : 5_000
      });
    } catch {
      if (await loginSignupBtn.isVisible().catch(() => false)) {
        return await goHomeWithOfflineSessionFallback("login/signup shell visible");
      }
      return false;
    }
    return await goHomeWithOfflineSessionFallback("continue offline visible");
  };

  // If "Continue offline" is visible, prefer clicking it even when the URL pathname
  // doesn't match the canonical auth routes (some builds show an offline landing page
  // at a different path). This reduces calendar failures where we were stuck on the
  // welcome/offline screen.
  {
    const handledNow = await clickContinueOfflineIfVisible().catch(() => false);
    if (handledNow) {
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }
  }

  if (!leftAuthPage) {
    for (let i = 0; i < 4; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }
    const pathNow = new URL(page.url()).pathname;
    if (pathNow === "/" || pathNow === "/signup" || pathNow === "/account/login") {
      await safeGoto("/signup");
      await page.waitForLoadState("domcontentloaded").catch(() => null);
      for (let j = 0; j < 3; j += 1) {
        const handled = await clickContinueOfflineIfVisible();
        if (!handled) break;
        await page.waitForLoadState("domcontentloaded").catch(() => null);
      }
    }
  }

  const productConfig = resolveProductConfig();
  const currentPath = new URL(page.url()).pathname;
  const onHome =
    currentPath === `/${productConfig.homePath}` ||
    currentPath.startsWith(`/${productConfig.homePath}/`);
  if (!onHome) {
    await page.goto(`/${productConfig.homePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(
      (u) => {
        const p = new URL(u).pathname;
        const home = `/${productConfig.homePath}`;
        return p === home || p.startsWith(`${home}/`);
      },
      { timeout: 15_000, waitUntil: "domcontentloaded" }
    );
  }

  const navMarkers = [
    ...productConfig.appMenuNavLabels.map((label) =>
      page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()
    ),
    page.getByRole("button", { name: "Today" }).first(),
    page.getByRole("button", { name: /command bar/i }).first(),
    page.getByTestId("topnav-account-settings").first(),
    page.getByTestId("leftnav-settings").first()
  ];
  await expect
    .poll(
      async () => {
        const p = new URL(page.url()).pathname;
        const quickContinueOffline = page.getByRole("button", { name: /Continue (using )?offline/i }).first();
        if (await quickContinueOffline.isVisible().catch(() => false)) {
          await goHomeWithOfflineSessionFallback("continue offline became visible during nav poll");
        }
        const quickLoginSignup = page.getByRole("button", { name: /Login\/Signup/i }).first();
        if (await quickLoginSignup.isVisible().catch(() => false)) {
          await goHomeWithOfflineSessionFallback("login/signup shell visible during nav poll");
        }
        if (p === "/" || p === "/signup" || p === "/account/login") {
          await clickContinueOfflineIfVisible().catch(() => false);
        }
        for (const marker of navMarkers) {
          if (await marker.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 45_000 }
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
  Goals: goalResourcePattern,
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
    { timeout: 10_000, waitUntil: "domcontentloaded" }
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
  const startX = minX - 20;
  const startY = minY - 10;
  if (
    startX < containerBox.x + 1 ||
    startY < containerBox.y + 1
  ) {
    throw new Error(
      `No empty gutter before the first thumbnails in #${containerId}; cannot start marquee selection outside a card`
    );
  }
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
 * Uses the outer element with data-testid="thumbnail-context-menu-trigger";
 * the inner button (ContextMenuAction) opens the menu.
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

import { expect, type Page } from "@playwright/test";
import { nucleusProductConfig } from "../../config/nucleus-product.config";
import { pointronProductConfig } from "../../config/pointron-product.config";
import { memotronProductConfig } from "../../config/memotron-product.config";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const baseURL = runtimeEnv?.APP_BASE_URL ?? "http://127.0.0.1:4173";

function getActiveProductConfig(pageUrl: string) {
  const host = new URL(pageUrl).host;
  if (host.includes("pointron")) return pointronProductConfig;
  if (host.includes("memotron")) return memotronProductConfig;
  return nucleusProductConfig;
}

/**
 * Ensure we're in the app (dismiss signup if needed) and on the Nucleus home (calendar),
 * with app nav visible. Same flow as navigation.spec: continue offline → calendar → nav ready.
 * Uses the project's baseURL (from Playwright config) so memotron/pointron/nucleus each open the correct origin.
 */
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

  const productConfig = getActiveProductConfig(page.url());
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

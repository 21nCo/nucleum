import { test, expect } from "@playwright/test";
import { nucleusProductConfig } from "../../config/nucleus-product.config";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const baseURL = runtimeEnv?.APP_BASE_URL ?? "http://127.0.0.1:4173";

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("regression", () => {
  test("already logged in (Google auth state): handle old page if present, then verify in app", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });

    // Uses storageState from .auth/user.json when present (see playwright.config.ts).
    // If you see login page instead of app, run: npm run e2e:save-auth
    await page.goto(baseURL);
    await page.waitForLoadState("domcontentloaded");

    const postLoginWaitMs = 25_000;
    const isApp = (url: URL) =>
      url.pathname === "/" ||
      url.pathname === `/${nucleusProductConfig.homePath}` ||
      url.pathname === `/${nucleusProductConfig.homePath}/`;

    const clickContinueOfflineIfVisible = async () => {
      const offlineTab = page.getByRole("button", { name: "Offline" }).first();
      // Main CTA: outer button with subtitle "Single device...". Fallback: any "Continue offline" button.
      const continueOfflineMain = page.getByRole("button", { name: /Continue (using )?offline/i })
        .filter({ hasText: /Single device|free forever|No signup/i }).first();
      const continueOfflineAny = page.getByRole("button", { name: /Continue (using )?offline/i }).first();

      const hasOfflineTab = await offlineTab.isVisible().catch(() => false);
      if (hasOfflineTab) {
        await offlineTab.click({ timeout: 5_000 }).catch(() => null);
      }

      const pathname = new URL(page.url()).pathname;
      const waitMs = pathname === "/signup" || pathname === "/account/login" ? 10_000 : 3_000;
      let continueOffline = continueOfflineMain;
      try {
        await continueOfflineMain.waitFor({ state: "visible", timeout: waitMs });
      } catch {
        try {
          await continueOfflineAny.waitFor({ state: "visible", timeout: 2_000 });
          continueOffline = continueOfflineAny;
        } catch {
          return false;
        }
      }

      {
        const beforePath = new URL(page.url()).pathname;
        await continueOffline.click({ timeout: 5_000, force: true }).catch(() => null);
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

        if (progressed) return true;

        // If URL did not move, treat as not handled so caller can retry.
        const afterPath = new URL(page.url()).pathname;
        return beforePath !== afterPath;
      }
    };

    // Stabilize initial screen: if signup/login panel appears, always prefer offline path.
    for (let i = 0; i < 4; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForURL((u) => isApp(new URL(u.toString())), {
        timeout: postLoginWaitMs
      }).catch(() => null);
    }

    const pathname = new URL(page.url()).pathname;
    expect(pathname === "/" || pathname === `/${nucleusProductConfig.homePath}` || pathname === `/${nucleusProductConfig.homePath}/` || pathname === "/signup" || pathname === "/account/login").toBe(true);

    // Even when URL looks app-like, app can still render signup/login panel.
    // Try clicking "Continue offline" a few times before calendar navigation.
    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    // Go to home page first; if redirected to signup/login, recover via offline and retry.
    const homePageUrl = new URL(`/${nucleusProductConfig.homePath}`, baseURL).toString();
    let atHomePage = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto(homePageUrl, { waitUntil: "domcontentloaded" });
      const reached = await page
        .waitForURL((u) => new RegExp(`^\\/${nucleusProductConfig.homePath}(\\/.*)?$`).test(new URL(u).pathname), {
          timeout: 8_000
        })
        .then(() => true)
        .catch(() => false);
      if (reached) {
        atHomePage = true;
        break;
      }
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) {
        break;
      }
    }
    if (!atHomePage) {
      throw new Error(
        `Could not reach /${nucleusProductConfig.homePath} after offline recovery; landed on ${new URL(page.url()).pathname}.`
      );
    }

    // On home page the signup overlay can still be visible; dismiss it so the app nav appears.
    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    // Visibility checks: ensure app navigation is rendered
    const contentTimeout = 20_000;
    const homeNav = page.getByRole("button").filter({ hasText: /^Home$/i }).first();
    // Create nav markers dynamically from product config
    const navMarkers = nucleusProductConfig.appMenuNavLabels.map(label =>
      page.getByRole("button").filter({ hasText: new RegExp(`^${label}$`, "i") }).first()
    );
    const todayButton = page.getByRole("button", { name: "Today" }).first();
    const allMarkers = [homeNav, ...navMarkers, todayButton];
    await expect
      .poll(
        async () => {
          for (const marker of allMarkers) {
            if (await marker.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: contentTimeout }
      )
      .toBe(true);

    // Required action: click a different nav item (Overview) and verify route changed.
    const testNavLabel = "Overview"; // Test navigation by clicking Overview
    const navAction = page
      .getByRole("button", { name: new RegExp(`^${testNavLabel}$`, "i") })
      .or(page.getByRole("link", { name: new RegExp(`^${testNavLabel}$`, "i") }))
      .first();
    await expect(navAction).toBeVisible({ timeout: 20_000 });
    await navAction.click({ timeout: 5_000, force: true });
    const expectedPath = nucleusProductConfig.pathByNavLabel[testNavLabel];
    await page.waitForURL((u) => new RegExp(`^${expectedPath}(\\/.*)?$`).test(new URL(u).pathname), {
      timeout: 20_000
    });

    const finalPath = new URL(page.url()).pathname;
    expect(finalPath === expectedPath || finalPath.startsWith(`${expectedPath}/`)).toBe(true);
  });
});

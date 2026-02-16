import { test, expect } from "@playwright/test";

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
      url.pathname === "/calendar" ||
      url.pathname === "/calendar/";

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
    expect(pathname === "/" || pathname === "/calendar" || pathname === "/calendar/" || pathname === "/signup" || pathname === "/account/login").toBe(true);

    // Even when URL looks app-like, app can still render signup/login panel.
    // Try clicking "Continue offline" a few times before calendar navigation.
    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    // Go to calendar first; if redirected to signup/login, recover via offline and retry.
    const calendarUrl = new URL("/calendar", baseURL).toString();
    let atCalendar = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto(calendarUrl, { waitUntil: "domcontentloaded" });
      const reached = await page
        .waitForURL((u) => /^\/calendar(\/.*)?$/.test(new URL(u).pathname), {
          timeout: 8_000
        })
        .then(() => true)
        .catch(() => false);
      if (reached) {
        atCalendar = true;
        break;
      }
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) {
        break;
      }
    }
    if (!atCalendar) {
      throw new Error(
        `Could not reach /calendar after offline recovery; landed on ${new URL(page.url()).pathname}.`
      );
    }

    // On /calendar the signup overlay can still be visible; dismiss it so the app nav (Home, Calendar, Overview, …) appears.
    for (let i = 0; i < 3; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    // Visibility checks: ensure app navigation is rendered
    const calendarContentTimeout = 20_000;
    const homeNav = page.getByRole("button").filter({ hasText: /^Home$/i }).first();
    const calendarNav = page.getByRole("button").filter({ hasText: /^Calendar$/i }).first();
    const overviewNav = page.getByRole("button").filter({ hasText: /^Overview$/i }).first();
    const libraryNav = page.getByRole("button").filter({ hasText: /^Library$/i }).first();
    const todayButton = page.getByRole("button", { name: "Today" }).first();
    const calendarMarkers = [homeNav, calendarNav, overviewNav, libraryNav, todayButton];
    await expect
      .poll(
        async () => {
          for (const marker of calendarMarkers) {
            if (await marker.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: calendarContentTimeout }
      )
      .toBe(true);

    // Required action: click Overview nav and verify route changed to /overview.
    const overviewNavAction = page
      .getByRole("button", { name: /^Overview$/i })
      .or(page.getByRole("link", { name: /^Overview$/i }))
      .first();
    await expect(overviewNavAction).toBeVisible({ timeout: 20_000 });
    await overviewNavAction.click({ timeout: 5_000, force: true });
    await page.waitForURL((u) => /^\/overview(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 20_000
    });

    const finalPath = new URL(page.url()).pathname;
    expect(finalPath === "/overview" || finalPath.startsWith("/overview/")).toBe(true);
  });
});

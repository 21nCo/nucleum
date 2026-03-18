/**
 * One-time save: log in with E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD, then save session.
 * Tests can use the saved session via storageState so they don't log in every time.
 *
 * Requires in .env (or env): E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and APP_BASE_URL (or APP_BASE_URL_<PROJECT>).
 *
 * Run:
 *   Nucleum:  npm run e2e:save-email-auth:nucleum   (or PRODUCT=nucleum APP_BASE_URL=... npm run e2e:save-email-auth)
 *   Memotron: npm run e2e:save-email-auth:memotron
 *   Pointron: npm run e2e:save-email-auth:pointron
 */

import "dotenv/config";
import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";

const authDir = path.join(__dirname, "..", ".auth");
const product = (process.env.PRODUCT ?? "nucleum").toLowerCase();
const authFileName = product === "nucleum" ? "user.json" : `user-${product}.json`;
const authStatePath = path.join(authDir, authFileName);

function getBaseURL(): string {
  // Match playwright.config.ts precedence: product-specific env first, then APP_BASE_URL, then fallback.
  const fallback = "http://127.0.0.1:4173";
  if (product === "nucleum") {
    return (
      process.env.APP_BASE_URL_NUCLEUM ??
      process.env.APP_BASE_URL_NUCLEUS ??
      process.env.APP_BASE_URL ??
      fallback
    );
  }
  const envKey = `APP_BASE_URL_${product.toUpperCase()}`;
  return process.env[envKey] ?? process.env.APP_BASE_URL ?? fallback;
}

async function main() {
  const email = process.env.E2E_LOGIN_EMAIL?.trim();
  const password = process.env.E2E_LOGIN_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD must be set in .env or environment.");
  }

  const baseURL = getBaseURL();
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log("Product:", product);
  console.log("Base URL:", baseURL);
  console.log("Auth will be saved to:", authStatePath);
  console.log("Logging in with email/password and saving session...\n");

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
  });

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 720 },
    // Local dev uses Caddy's `tls internal` certs; Playwright's bundled Chromium may not honor the OS trust store.
    // Keep this enabled so the auth-save script can run in CI/local HTTPS environments without flaking.
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  try {
    // Start on "/" – app may show "Login/Signup" or "Signup/Login" button first (or redirect to /account/login)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000); // let SPA and auth check settle

    let pathname = new URL(page.url()).pathname;

    // If we're on "/", click Login/Signup (or Signup/Login) to open the login page
    if (pathname === "/") {
      const loginSignupBtn = page.getByRole("button", { name: /login|signup/i }).first();

      // Pure UI approach: ensure the button is interactable, click with retries, and only continue once
      // the login page UI is detected.
      const hasLoginBtn = await loginSignupBtn
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      // Only click if the button is present (e.g., if we're not already redirected/logged in).
      let loginUiReady = false;
      if (hasLoginBtn) {
        for (let i = 0; i < 5; i++) {
          const enabled = await loginSignupBtn.isEnabled().catch(() => false);
          if (!enabled) await page.waitForTimeout(500);

          await loginSignupBtn.scrollIntoViewIfNeeded().catch(() => null);
          await loginSignupBtn.click({ timeout: 10_000 }).catch(() => null);

          const navigated = await page
            .waitForURL(/\/account\/login/, { timeout: 10_000, waitUntil: "domcontentloaded" })
            .then(() => true)
            .catch(() => false);
          if (navigated) break;

          // Sometimes URL change is delayed; alternatively detect the login UI.
          loginUiReady = await page
            .getByRole("tab", { name: /^Log in$/i })
            .first()
            .waitFor({ state: "visible", timeout: 5_000 })
            .then(() => true)
            .catch(() => false);
          if (loginUiReady) break;

          await page.waitForTimeout(800);
        }
      }
      pathname = new URL(page.url()).pathname;
      if (pathname !== "/account/login" && loginUiReady) {
        pathname = "/account/login";
      }
    }

    if (pathname !== "/account/login") {
      throw new Error(
        `Expected to be on /account/login after clicking Login/Signup; got ${pathname}`
      );
    }

    await page.waitForTimeout(1_000); // let login form render

    // Click "Log in" tab (BoxSwitcher option), then fill email and password
    const logInTab = page
      .getByRole("tab", { name: /^Log in$/i })
      .or(page.getByRole("button", { name: /^Log in$/i }))
      .first();
    await logInTab.waitFor({ state: "visible", timeout: 15_000 });
    await logInTab.click({ timeout: 10_000 });
    await page.waitForTimeout(800);

    const emailInput = page.getByPlaceholder("username@email.com").or(page.getByLabel("Email"));
    const emailVisible = await emailInput
      .waitFor({ state: "visible", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (!emailVisible) {
      throw new Error(
        "Email input did not appear. Is email/password login enabled for this app?"
      );
    }
    await emailInput.fill(email);
    await page.waitForTimeout(300);

    // Some builds show an explicit "Enter password" button, others show the password field directly.
    const enterPasswordBtn = page.getByRole("button", { name: /Enter password/i });
    const passwordInput = page.locator("#password");

    const haveEnterPassword = await enterPasswordBtn
      .first()
      .waitFor({ state: "visible", timeout: 7_500 })
      .then(() => true)
      .catch(() => false);
    if (haveEnterPassword) {
      await enterPasswordBtn.first().click({ timeout: 10_000 }).catch(() => null);
      await page.waitForTimeout(500);
    }

    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill(password);
    await page.waitForTimeout(300);

    // Wait for the auth API response so the session cookie is applied before we save.
    const isAccountRelated = (url: string) => {
      try {
        const u = new URL(url);
        return u.pathname.startsWith("/account") || /(^|\.)account\./i.test(u.hostname);
      } catch {
        return /account/i.test(url);
      }
    };
    const responsePromise = page
      .waitForResponse(
        (res) => isAccountRelated(res.url()),
        { timeout: 25_000 }
      )
      .catch(() => null);

    // Wait for response that sets session cookie. Playwright's response.headers() does NOT expose Set-Cookie,
    // so use allHeaders() which includes it.
    const sessionCookiePromise = page
      .waitForResponse(
        async (res) => {
          const h = await res.allHeaders();
          const setCookie = h["set-cookie"] ?? h["Set-Cookie"];
          const value = Array.isArray(setCookie) ? setCookie.join(" ") : setCookie;
          return typeof value === "string" && /session_token|session_data/i.test(value);
        },
        { timeout: 25_000 }
      )
      .catch(() => null);

    // Avoid clicking the "Log in" tab again; target the form submit button.
    const submitBtn = page
      .locator('form button[type="submit"]', { hasText: /^Log in$/i })
      .first()
      .or(page.getByRole("button", { name: /^Log in$/i }).last());
    await submitBtn.click({ timeout: 10_000 });

    await responsePromise;
    await sessionCookiePromise;

    const leftLogin = await page
      .waitForURL(
        (u) => new URL(u).pathname !== "/account/login",
        {
        timeout: 40_000,
        waitUntil: "domcontentloaded"
        }
      )
      .then(() => true)
      .catch(() => false);

    if (!leftLogin) {
      throw new Error("Login did not complete (still on login page). Check credentials and app.");
    }

    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => null);
    await page.waitForTimeout(2_000);

    // Same as memotron/pointron: ensure we're on the app origin so session cookies for that origin are in context.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => null);
    await page.waitForTimeout(2_000);

    // Wait until the session cookie is actually in the context (Playwright may not expose Set-Cookie in headers).
    const hostname = new URL(baseURL).hostname;
    const parentDomain =
      net.isIP(hostname) !== 0 || hostname === "localhost"
        ? hostname
        : hostname.includes(".")
          ? hostname.split(".").slice(-2).join(".")
          : hostname; // e.g. local.nucleum.app -> nucleum.app
    const sessionCookieName = "__Secure-21n.session_token";
    const deadline = Date.now() + 15_000;
    let hasSessionCookie = false;
    while (Date.now() < deadline) {
      const cookies = await context.cookies();
      const hasSession = cookies.some(
        (c) =>
          (c.name === sessionCookieName || c.name?.includes("session_token")) &&
          (c.domain === parentDomain || c.domain === `.${parentDomain}`)
      );
      if (hasSession) {
        hasSessionCookie = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!hasSessionCookie) {
      throw new Error("Session cookie was not detected; refusing to save unauthenticated storageState.");
    }

    // Save after login success so session cookie is in context. Do NOT click "Continue offline" — tests will do that.
    await context.storageState({ path: authStatePath });
    console.log("Session saved to", authStatePath);
    console.log("Run tests with: npx playwright test --project=" + product);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

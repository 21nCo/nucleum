import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  resolveAccountBaseUrl,
  resolveAccountCookiePrefix,
  resolveAccountEnvironment
} from "@nucleum/client/runtime/account/network";

const ENV_KEYS = [
  "VITE_ACCOUNT_BASE_URL",
  "VITE_ACCOUNT_BASE_URL_TEMPLATE",
  "VITE_ACCOUNT_DOMAIN",
  "VITE_ACCOUNT_COOKIE_PREFIX",
  "VITE_HOST",
  "VITE_ENV"
] as const;

describe("client/runtime/account/network shared 21n.dev zone", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    resetImportMetaEnv();
  });

  afterEach(() => {
    resetImportMetaEnv();
    delete (globalThis as { window?: unknown }).window;
  });

  it("renders per-product dev account templates on 21n.dev", () => {
    setWindow({ protocol: "https:", hostname: "nucleum.21n.dev" });
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE =
      "https://nucleum-account-{region}.21n.dev";

    expect(resolveAccountBaseUrl("insouth")).toBe(
      "https://nucleum-account-insouth.21n.dev"
    );
    expect(resolveAccountBaseUrl("useast")).toBe(
      "https://nucleum-account-useast.21n.dev"
    );
    expect(resolveAccountBaseUrl("euwest")).toBe(
      "https://nucleum-account-euwest.21n.dev"
    );
  });

  it("derives dev account hosts from the dev web host", () => {
    setWindow({ protocol: "https:", hostname: "memotron.21n.dev" });
    expect(resolveAccountEnvironment()).toBe("dev");
    expect(resolveAccountBaseUrl("useast")).toBe(
      "https://memotron-account-useast.21n.dev"
    );

    setWindow({ protocol: "https:", hostname: "nucleum.21n.dev" });
    expect(resolveAccountBaseUrl("insouth")).toBe(
      "https://nucleum-account-insouth.21n.dev"
    );
  });

  it("falls back to the default region for hyphenated dev regions", () => {
    setWindow({ protocol: "https:", hostname: "memotron.21n.dev" });
    expect(resolveAccountBaseUrl("us-east")).toBe(
      "https://memotron-account-insouth.21n.dev"
    );
  });

  it("falls back to the default region for non-label region values", () => {
    setWindow({ protocol: "https:", hostname: "memotron.21n.dev" });
    expect(resolveAccountBaseUrl("evil.com/x")).toBe(
      "https://memotron-account-insouth.21n.dev"
    );
  });

  it("treats 21n.dev account hosts as the dev backend for cookie prefixes", () => {
    setWindow({ protocol: "https:", hostname: "pointron.21n.dev" });
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE =
      "https://pointron-account-{region}.21n.dev";
    expect(resolveAccountCookiePrefix("euwest")).toBe("nucleus");
  });

  it("derives native dev account hosts on 21n.dev", () => {
    setWindow(
      { protocol: "tauri:", hostname: "localhost" },
      { environment: "dev", product: "memotron.app", defaultRegion: "insouth" }
    );
    expect(resolveAccountBaseUrl("euwest")).toBe(
      "https://memotron-account-euwest.21n.dev"
    );
  });

  it("strips a leading dot from the native account domain for dev hosts", () => {
    setWindow(
      { protocol: "tauri:", hostname: "localhost" },
      {
        environment: "dev",
        accountDomain: ".pointron.app",
        defaultRegion: "insouth"
      }
    );
    expect(resolveAccountBaseUrl("useast")).toBe(
      "https://pointron-account-useast.21n.dev"
    );
  });

  function setWindow(
    location: { protocol: string; hostname: string },
    nativeConfig?: Record<string, string>
  ) {
    Object.defineProperty(globalThis, "window", {
      value: nativeConfig
        ? { location, __NUCLEUM_NATIVE_CONFIG__: nativeConfig }
        : { location },
      writable: true,
      configurable: true
    });
  }

  function resetImportMetaEnv() {
    for (const key of Object.keys(import.meta.env)) {
      if (key.startsWith("VITE_")) {
        delete import.meta.env[key];
      }
    }
    Object.assign(import.meta.env, originalEnv);
    for (const key of ENV_KEYS) {
      delete import.meta.env[key];
    }
  }
});

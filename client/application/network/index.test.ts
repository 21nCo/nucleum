import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveAccountBaseUrl, resolveAccountCookiePrefix, resolveAccountDomain, resolveAccountEnvironment } from "@nucleum/client/runtime/account/network";

describe("client/components/network account URL resolution", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    resetImportMetaEnv();
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          protocol: "https:",
          hostname: "local.nucleum.app"
        }
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    resetImportMetaEnv();
    delete (globalThis as { window?: unknown }).window;
  });

  it("keeps VITE_ACCOUNT_BASE_URL as an intentional single-backend override", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL = "https://account-insouth-dev.nucleum.app/";
    expect(resolveAccountBaseUrl("insouth")).toBe("https://account-insouth-dev.nucleum.app");
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-insouth-dev.nucleum.app");
    expect(resolveAccountBaseUrl("euwest")).toBe("https://account-insouth-dev.nucleum.app");
  });

  it("uses VITE_ACCOUNT_BASE_URL_TEMPLATE for local app against deployed dev multi-region workers", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://nucleum-account-{region}.21n.dev";

    expect(resolveAccountBaseUrl("insouth")).toBe("https://nucleum-account-insouth.21n.dev");
    expect(resolveAccountBaseUrl("useast")).toBe("https://nucleum-account-useast.21n.dev");
    expect(resolveAccountBaseUrl("euwest")).toBe("https://nucleum-account-euwest.21n.dev");
  });

  it("derives dev account hosts on the shared 21n.dev zone from the dev web host", () => {
    setWindowHost("memotron.21n.dev");
    expect(resolveAccountEnvironment()).toBe("dev");
    expect(resolveAccountBaseUrl("useast")).toBe("https://memotron-account-useast.21n.dev");

    setWindowHost("nucleum.21n.dev");
    expect(resolveAccountBaseUrl("insouth")).toBe("https://nucleum-account-insouth.21n.dev");
  });

  it("treats 21n.dev account hosts as the dev backend for cookie prefixes", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://pointron-account-{region}.21n.dev";
    expect(resolveAccountCookiePrefix("euwest")).toBe("nucleus");
  });

  it("derives native dev account hosts on the shared 21n.dev zone", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { protocol: "tauri:", hostname: "localhost" },
        __NUCLEUM_NATIVE_CONFIG__: { environment: "dev", product: "memotron.app", defaultRegion: "insouth" }
      },
      writable: true,
      configurable: true
    });
    expect(resolveAccountBaseUrl("euwest")).toBe("https://memotron-account-euwest.21n.dev");
  });

  it("lets templates target upper environments without relying on the local app host", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}-pre.nucleum.app/";
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-useast-pre.nucleum.app");

    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}.nucleum.app/";
    expect(resolveAccountBaseUrl("euwest")).toBe("https://account-euwest.nucleum.app");
  });

  it("derives the AuthFn cookie prefix from the selected account backend", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}-dev.nucleum.app";
    expect(resolveAccountCookiePrefix("useast")).toBe("nucleus");

    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}-local.nucleum.app";
    expect(resolveAccountCookiePrefix("euwest")).toBe("nucleus_local");

    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}-pre.nucleum.app";
    expect(resolveAccountCookiePrefix("insouth")).toBe("nucleus_pre");
  });

  it("allows the AuthFn cookie prefix to be explicitly overridden", () => {
    import.meta.env.VITE_ACCOUNT_COOKIE_PREFIX = "custom_cookie_prefix";
    expect(resolveAccountCookiePrefix("insouth")).toBe("custom_cookie_prefix");
  });

  it("supports env/domain placeholders when the current host should drive account environment", () => {
    import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE = "https://account-{region}{envSuffix}.{domain}";

    expect(resolveAccountBaseUrl("insouth")).toBe("https://account-insouth-local.nucleum.app");

    setWindowHost("dev.nucleum.app");
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-useast-dev.nucleum.app");

    setWindowHost("web.nucleum.app");
    expect(resolveAccountBaseUrl("euwest")).toBe("https://account-euwest.nucleum.app");
  });

  it("derives the account domain from the current product host by default", () => {
    setWindowHost("dev.memotron.app");
    expect(resolveAccountDomain()).toBe("memotron.app");
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-useast-dev.memotron.app");

    setWindowHost("pre.pointron.app");
    expect(resolveAccountDomain()).toBe("pointron.app");
    expect(resolveAccountBaseUrl("euwest")).toBe("https://account-euwest-pre.pointron.app");

    setWindowHost("web.nucleum.app");
    expect(resolveAccountDomain()).toBe("nucleum.app");
    expect(resolveAccountBaseUrl("insouth")).toBe("https://account-insouth.nucleum.app");
  });

  it("keeps VITE_ACCOUNT_DOMAIN as an explicit account-domain override", () => {
    setWindowHost("dev.memotron.app");
    import.meta.env.VITE_ACCOUNT_DOMAIN = "nucleum.app";

    expect(resolveAccountDomain()).toBe("nucleum.app");
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-useast-dev.nucleum.app");
  });

  it("derives local multi-region account domains when no override is set", () => {
    expect(resolveAccountEnvironment()).toBe("local");
    expect(resolveAccountBaseUrl("insouth")).toBe("https://account-insouth-local.nucleum.app");
    expect(resolveAccountBaseUrl("useast")).toBe("https://account-useast-local.nucleum.app");
    expect(resolveAccountBaseUrl("euwest")).toBe("https://account-euwest-local.nucleum.app");
  });

  function setWindowHost(hostname: string) {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          protocol: "https:",
          hostname
        }
      },
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
    delete import.meta.env.VITE_ACCOUNT_BASE_URL;
    delete import.meta.env.VITE_ACCOUNT_BASE_URL_TEMPLATE;
    delete import.meta.env.VITE_ACCOUNT_DOMAIN;
    delete import.meta.env.VITE_ACCOUNT_COOKIE_PREFIX;
    delete import.meta.env.VITE_HOST;
    delete import.meta.env.VITE_ENV;
  }
});

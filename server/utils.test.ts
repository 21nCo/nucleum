import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { createDatabaseProvider } from "@tests/fixtures/database";
import { describeFuzz, fuzzAssertConfig } from "@tests/utils/fuzz";

const extractProductMock = vi.fn();
const databaseProvider = createDatabaseProvider();

vi.mock("$lib/shared/utils/utils", () => ({
  extractProduct: extractProductMock
}));

vi.mock("$lib/server/database/providers", () => ({
  DatabaseProviderFactory: {
    getProvider: vi.fn(() => databaseProvider)
  }
}));

const modulePromise = import("./utils");

describe("server utils", () => {
  beforeEach(() => {
    extractProductMock.mockReset();
    databaseProvider.getProductConfig.mockReset();
    databaseProvider.createSubscription.mockReset();
  });

  it("retrieves app config and merges environment overrides", async () => {
    extractProductMock.mockReturnValue({ env: "dev", product: "pointron" });
    databaseProvider.getProductConfig.mockResolvedValue({
      env: {
        dev: { featureFlags: { onboarding: true } }
      },
      defaultTheme: "dark"
    });

    const { retrieveAppConfig } = await modulePromise;
    const result = await retrieveAppConfig("dev.pointron.app");

    expect(extractProductMock).toHaveBeenCalledWith("dev.pointron.app");
    expect(databaseProvider.getProductConfig).toHaveBeenCalledWith("pointron");
    expect(result).toMatchObject({
      env: "dev",
      product: "pointron",
      featureFlags: { onboarding: true },
      defaultTheme: "dark"
    });
  });

  it("propagates subscription payloads to the provider", async () => {
    const now = new Date().toISOString();
    extractProductMock.mockReturnValue({ env: "live", product: "memotron" });
    databaseProvider.createSubscription.mockResolvedValue([
      { result: [{ subscribedAt: now }] }
    ]);

    const { saveSubscription } = await modulePromise;
    const timestamp = await saveSubscription({
      email: "user@example.com",
      app: "live.memotron.app",
      context: { referrer: "homepage" }
    });

    expect(databaseProvider.createSubscription).toHaveBeenCalledWith({
      email: "user@example.com",
      app: "live.memotron.app",
      context: { referrer: "homepage" },
      productId: "memotron"
    });
    expect(timestamp).toBe(now);
  });

  it("returns an error payload when provider throws", async () => {
    extractProductMock.mockReturnValue({ env: "live", product: "nucleus" });
    databaseProvider.createSubscription.mockRejectedValue(new Error("boom"));

    const { saveSubscription } = await modulePromise;
    const response = await saveSubscription({
      email: "user@example.com",
      app: "live.nucleus.app",
      context: {}
    });

    expect(response).toMatchObject({
      error: "An error occured"
    });
  });
});

describeFuzz("server utils fuzz properties", () => {
  it("sanitizes arbitrary subscription payloads", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          env: fc.constantFrom("dev", "live", "preview"),
          product: fc
            .stringOf(fc.alphaNumeric(), { minLength: 3, maxLength: 16 })
            .map((value) => value.toLowerCase()),
          email: fc.emailAddress(),
          context: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 12 }),
            fc.jsonValue()
          ),
          timestamp: fc.date({ min: new Date(0) }).map((date) => date.toISOString())
        }),
        async ({ env, product, email, context, timestamp }) => {
          extractProductMock.mockReturnValue({ env, product });
          databaseProvider.createSubscription.mockClear();
          databaseProvider.createSubscription.mockResolvedValueOnce([
            { result: [{ subscribedAt: timestamp }] }
          ]);

          const { saveSubscription } = await modulePromise;

          const result = await saveSubscription({
            email,
            app: `${env}.${product}.app`,
            context
          });

          expect(databaseProvider.createSubscription).toHaveBeenCalledTimes(1);
          expect(databaseProvider.createSubscription).toHaveBeenCalledWith(
            expect.objectContaining({
              email,
              app: `${env}.${product}.app`,
              context,
              productId: product
            })
          );
          expect(result).toBe(timestamp);
        }
      ),
      fuzzAssertConfig
    );
  });
});

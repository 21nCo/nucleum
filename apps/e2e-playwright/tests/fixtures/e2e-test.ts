import { expect, test as base } from "@playwright/test";

import { FocusSeed } from "../focus/focus-seed";
import { MemorySeed } from "../memory/memory-seed";
import { CollectionSeed } from "../shared/collection/collection-seed";
import { DatafnSeedTransport } from "./datafn-seed";

export type E2ESeed = {
  collections: CollectionSeed;
  focus: FocusSeed;
  memory: MemorySeed;
};

type E2EFixtures = {
  seed: E2ESeed;
};

/** Playwright test extended with domain-owned DataFn seed builders. */
export const test = base.extend<E2EFixtures>({
  seed: async ({ page }, use, testInfo) => {
    const transport = new DatafnSeedTransport(page, testInfo);
    await use({
      collections: new CollectionSeed(transport),
      focus: new FocusSeed(transport),
      memory: new MemorySeed(transport)
    });
    const cleanupFailures = await transport.cleanup();
    if (cleanupFailures.length > 0) {
      await testInfo.attach("datafn-seed-cleanup-failures", {
        body: Buffer.from(cleanupFailures.join("\n")),
        contentType: "text/plain"
      });
    }
  }
});

export { expect };

import fc from "fast-check";
import { describe } from "vitest";

export const isFuzzEnabled = process.env.VITEST_FUZZ === "1";

export const fuzzAssertConfig = {
  numRuns: isFuzzEnabled ? 500 : 100,
  interruptAfterTimeLimit: isFuzzEnabled ? 120_000 : 30_000,
  verbose: isFuzzEnabled
} as const;

fc.configureGlobal({
  numRuns: fuzzAssertConfig.numRuns,
  interruptAfterTimeLimit: fuzzAssertConfig.interruptAfterTimeLimit
});

type SuiteFactory = Parameters<typeof describe>[1];

export function describeFuzz(name: string, factory: SuiteFactory) {
  if (isFuzzEnabled) {
    return describe(name, factory);
  }

  return describe.skip(name, factory);
}

export function fuzzOnly<T>(callback: () => T): T | undefined {
  if (isFuzzEnabled) {
    return callback();
  }

  return undefined;
}

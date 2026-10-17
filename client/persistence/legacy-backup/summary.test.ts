import { describe, expect, it } from "vitest";
import {
  hasRecoverableLegacyLocalData,
  resolveLegacyLocalDataRecordCount
} from "./summary";
import type { LegacyLocalDataSummary } from "./types";

describe("legacy backup summary", () => {
  it("counts recoverable legacy records from summaries and backups", () => {
    const summary: LegacyLocalDataSummary = {
      isSupported: true,
      databases: [
        {
          name: "local-user-1",
          version: 120,
          provider: "dexie",
          stores: [
            { name: "goal", count: 2 },
            { name: "task", count: 1 }
          ]
        }
      ]
    };

    expect(resolveLegacyLocalDataRecordCount(summary)).toBe(3);
    expect(hasRecoverableLegacyLocalData(summary)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  isPointronDatafnBackup,
  pointronDatafnBackupResources,
  resolveDatafnImportErrorCount
} from "./pointronDatafnBackup.utils";

describe("pointronDatafnBackup.utils", () => {
  it("accepts Pointron DataFn export payloads", () => {
    const resources = Object.fromEntries(
      pointronDatafnBackupResources.map((resource) => [resource, []])
    );

    expect(
      isPointronDatafnBackup({
        version: 1,
        exportedAt: new Date().toISOString(),
        schema: pointronDatafnBackupResources.map((resource) => ({
          name: resource,
          version: 1
        })),
        resources,
        joins: {}
      })
    ).toBe(true);
  });

  it("rejects non-Pointron and malformed payloads", () => {
    expect(
      isPointronDatafnBackup({
        version: 1,
        resources: {
          node: []
        },
        joins: {}
      })
    ).toBe(false);

    expect(
      isPointronDatafnBackup({
        version: 1,
        resources: {
          objective: {}
        },
        joins: {}
      })
    ).toBe(false);

    expect(isPointronDatafnBackup({ resources: { objective: [] } })).toBe(
      false
    );
  });

  it("counts DataFn import result errors", () => {
    expect(resolveDatafnImportErrorCount({ errors: [{}, {}] })).toBe(2);
    expect(resolveDatafnImportErrorCount({ ok: true })).toBe(0);
  });
});

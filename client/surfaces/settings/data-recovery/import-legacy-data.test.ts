import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NucleumDatafnRuntime } from "@nucleum/datafn/datafn.store";
import type { LegacyLocalDataBackup } from "@nucleum/persistence/legacy-backup/types";

const mocks = vi.hoisted(() => ({
  importData: vi.fn(),
  set: vi.fn(),
  refresh: vi.fn(),
  convert: vi.fn(),
  normalize: vi.fn((value) => value)
}));
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { importData: mocks.importData, kv: { set: mocks.set } },
  refreshNucleumDatafnStatus: mocks.refresh
}));
vi.mock("@nucleum/persistence/legacy-backup/datafn-import", () => ({
  convertLegacyLocalDataBackupToDatafnImport: mocks.convert,
  normalizeLegacyDatafnImportIds: mocks.normalize
}));

import { importLegacyLocalDataBackup } from "./import-legacy-data";

describe("legacy migration import", () => {
  const backup = {} as LegacyLocalDataBackup;
  const runtime = { storage: {}, mode: "local-only" } as NucleumDatafnRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.convert.mockReturnValue({
      resources: { node: [{ id: "node:1" }] },
      kv: { appearance: {} }
    });
    mocks.importData.mockResolvedValue({
      ok: true,
      stats: { resources: { node: { imported: 1 } } }
    });
    mocks.set.mockResolvedValue({ ok: true });
  });

  it("imports records and preferences before refreshing status", async () => {
    expect(await importLegacyLocalDataBackup(runtime, backup)).toEqual({
      resources: 2,
      joins: 0
    });
    expect(mocks.importData).toHaveBeenCalledWith(
      { resources: { node: [{ id: "node:1" }] } },
      { triggerCloneUp: false }
    );
    expect(mocks.set).toHaveBeenCalledWith("appearance", {});
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("clones imported rows upward only for sync runtimes", async () => {
    await importLegacyLocalDataBackup({ ...runtime, mode: "sync" }, backup);
    expect(mocks.importData.mock.calls[0][1]).toEqual({ triggerCloneUp: true });
  });

  it("rejects skipped rows before writing preferences", async () => {
    mocks.importData.mockResolvedValue({
      ok: true,
      stats: { resources: { node: { imported: 0, skipped: 1 } } }
    });
    await expect(importLegacyLocalDataBackup(runtime, backup)).rejects.toThrow(
      "skipped records"
    );
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("rejects missing local storage and failed preference writes", async () => {
    await expect(
      importLegacyLocalDataBackup(
        { mode: "sync" } as NucleumDatafnRuntime,
        backup
      )
    ).rejects.toThrow("storage is required");
    mocks.set.mockResolvedValue({
      ok: false,
      error: new Error("write failed")
    });
    await expect(importLegacyLocalDataBackup(runtime, backup)).rejects.toThrow(
      "write failed"
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

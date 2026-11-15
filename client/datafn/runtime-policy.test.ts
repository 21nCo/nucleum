import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored = new Map<string, string>();

vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: {
    get: vi.fn(async (key: string) => stored.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      stored.set(key, value);
    })
  }
}));

import { resolveDatafnOfflinabilityPreference } from "./runtime-policy";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const dbName = "nucleum-datafn-local-nucleum_user_user_1";

function stubDatabases(databases: (() => Promise<{ name: string }[]>) | undefined) {
  vi.stubGlobal("window", {});
  vi.stubGlobal("indexedDB", databases ? { databases } : {});
}

describe("resolveDatafnOfflinabilityPreference", () => {
  beforeEach(() => stored.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("starts a new device in direct mode and saves that choice", async () => {
    stubDatabases(async () => [{ name: "other-db" }]);
    await expect(
      resolveDatafnOfflinabilityPreference({ storageDbName: dbName })
    ).resolves.toBe(false);
    expect(stored.get(ClientStorageKey.DATAFN_OFFLINABILITY)).toBe("false");
  });

  it("keeps offline storage when the local copy already exists", async () => {
    stubDatabases(async () => [{ name: dbName }]);
    await expect(
      resolveDatafnOfflinabilityPreference({ storageDbName: dbName })
    ).resolves.toBe(true);
    expect(stored.get(ClientStorageKey.DATAFN_OFFLINABILITY)).toBe("true");
  });

  it("assumes a local copy may exist when the browser can't list databases", async () => {
    stubDatabases(undefined);
    await expect(
      resolveDatafnOfflinabilityPreference({ storageDbName: dbName })
    ).resolves.toBe(true);
  });

  it("returns a saved preference without looking at databases", async () => {
    const databases = vi.fn(async () => [{ name: dbName }]);
    stubDatabases(databases);
    stored.set(ClientStorageKey.DATAFN_OFFLINABILITY, "false");
    await expect(
      resolveDatafnOfflinabilityPreference({ storageDbName: dbName })
    ).resolves.toBe(false);
    expect(databases).not.toHaveBeenCalled();
  });

  it("reports the default without saving when no database name is given", async () => {
    stubDatabases(async () => [{ name: dbName }]);
    await expect(resolveDatafnOfflinabilityPreference()).resolves.toBe(false);
    expect(stored.has(ClientStorageKey.DATAFN_OFFLINABILITY)).toBe(false);
  });
});

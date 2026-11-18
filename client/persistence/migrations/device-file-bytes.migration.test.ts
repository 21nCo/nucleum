import { beforeEach, describe, expect, it, vi } from "vitest";
import { configurePersistenceLogger } from "@nucleum/persistence/logging-host";
import {
  deriveDeviceFileId,
  migrateDeviceFileBytes,
  type DeviceFileBytesMigrationHost,
  type DeviceFileBytesRecord
} from "@nucleum/persistence/migrations/device-file-bytes.migration";

/** Client storage kept in memory, so a second run sees what the first saved. */
const storage = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  return {
    values,
    clientStorage: {
      get: async (key: string) => values.get(key),
      set: async (key: string, value: unknown) => {
        values.set(key, JSON.stringify(value));
      },
      remove: async (key: string) => {
        values.delete(key);
      }
    }
  };
});
vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: storage.clientStorage
}));

const NAMESPACE = "guest:device-1";

/**
 * A namespace's `file` records and the OPFS queue the migration moves their
 * bytes to, kept across runs. `interruptAt` makes the matching step of one
 * record never finish, as when the tab closes there.
 */
function createDevice(records: DeviceFileBytesRecord[]) {
  const table = new Map(records.map((record) => [record.id, { ...record }]));
  const queue = new Map<string, unknown>();
  const stages: string[] = [];
  const never = new Promise<never>(() => undefined);
  const host = (
    options: {
      interruptAt?: { step: "stage" | "commit"; id: string };
      failCommitOf?: string;
    } = {}
  ): DeviceFileBytesMigrationHost => ({
    namespace: NAMESPACE,
    listRecordIds: async () => [...table.keys()],
    readRecord: async (id) => {
      const record = table.get(id);
      return record && { ...record };
    },
    stage: async (record, fileId) => {
      if (
        options.interruptAt?.step === "stage" &&
        options.interruptAt.id === record.id
      ) {
        return never;
      }
      stages.push(fileId);
      queue.set(fileId, record.data);
    },
    commit: async (record, fileId) => {
      if (
        options.interruptAt?.step === "commit" &&
        options.interruptAt.id === record.id
      ) {
        return never;
      }
      if (options.failCommitOf === record.id) throw new Error("save failed");
      table.set(record.id, {
        ...table.get(record.id)!,
        fileId,
        data: null,
        thumbnailData: null
      });
    },
    unstage: async (fileId) => {
      queue.delete(fileId);
    }
  });
  return { table, queue, stages, host };
}

function bytes(text: string) {
  return new TextEncoder().encode(text);
}

beforeEach(() => {
  storage.values.clear();
  configurePersistenceLogger({ error: vi.fn(), info: vi.fn() });
});

describe("migrateDeviceFileBytes", () => {
  it("moves every record's bytes to the queue once, leaving records without bytes alone", async () => {
    const device = createDevice([
      { id: "file:a", data: bytes("a"), thumbnailData: bytes("ta") },
      { id: "file:b", data: bytes("b") },
      { id: "file:c", fileId: "file_alreadyMoved" },
      { id: "file:d", thumbnailData: bytes("legacy url thumbnail") }
    ]);

    expect(await migrateDeviceFileBytes(device.host())).toEqual({
      moved: 2,
      failed: 0
    });
    expect(device.table.get("file:a")).toMatchObject({
      fileId: await deriveDeviceFileId(NAMESPACE, "file:a"),
      data: null,
      thumbnailData: null
    });
    expect(device.table.get("file:d")).toEqual({
      id: "file:d",
      thumbnailData: bytes("legacy url thumbnail")
    });
    expect(device.queue.size).toBe(2);

    device.table.set("file:e", { id: "file:e", data: bytes("e") });
    expect(await migrateDeviceFileBytes(device.host())).toEqual({
      moved: 0,
      failed: 0
    });
    expect(device.table.get("file:e")?.fileId).toBeUndefined();
  });

  it.each(["stage", "commit"] as const)(
    "finishes a run interrupted at a record's %s without a duplicate file",
    async (step) => {
      const device = createDevice([
        { id: "file:a", data: bytes("a") },
        { id: "file:b", data: bytes("b") },
        { id: "file:c", data: bytes("c") }
      ]);
      void migrateDeviceFileBytes(
        device.host({ interruptAt: { step, id: "file:b" } })
      );
      await vi.waitFor(() =>
        expect(device.table.get("file:a")?.fileId).toBeTruthy()
      );

      expect(await migrateDeviceFileBytes(device.host())).toEqual({
        moved: 2,
        failed: 0
      });

      const fileIds = await Promise.all(
        ["file:a", "file:b", "file:c"].map((id) =>
          deriveDeviceFileId(NAMESPACE, id)
        )
      );
      expect([...device.table.values()].map((record) => record.fileId)).toEqual(
        fileIds
      );
      expect([...device.queue.keys()].sort()).toEqual([...fileIds].sort());
      expect(await migrateDeviceFileBytes(device.host())).toEqual({
        moved: 0,
        failed: 0
      });
    }
  );

  it("keeps a record whose save fails as it was, removes its staged file and runs again later", async () => {
    const device = createDevice([{ id: "file:a", data: bytes("a") }]);

    expect(
      await migrateDeviceFileBytes(device.host({ failCommitOf: "file:a" }))
    ).toEqual({ moved: 0, failed: 1 });
    expect(device.table.get("file:a")).toEqual({
      id: "file:a",
      data: bytes("a")
    });
    expect(device.queue.size).toBe(0);

    expect(await migrateDeviceFileBytes(device.host())).toEqual({
      moved: 1,
      failed: 0
    });
  });

  it("derives one fileId per namespace and record that FileFn accepts", async () => {
    const fileId = await deriveDeviceFileId(NAMESPACE, "file:a");

    expect(fileId).toMatch(/^file_[A-Za-z0-9_-]{8,64}$/);
    expect(await deriveDeviceFileId(NAMESPACE, "file:a")).toBe(fileId);
    expect(await deriveDeviceFileId("user:u1", "file:a")).not.toBe(fileId);
  });
});

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDatafnClient,
  MemoryStorageAdapter,
  type DatafnClient,
  type DatafnSyncConfig
} from "@datafn/client";
import { createDatafnServer, type DatafnServer } from "@datafn/server";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import { nucleumDatafnSchema } from "@nucleum/schema/datafn";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import {
  cloneUpAllDatafnData,
  datafn,
  datafnRuntime,
  destroyNucleumDatafn
} from "./datafn.store";
import { Product } from "@nucleum/client/config/product.type";

type NucleumClient = DatafnClient<typeof nucleumDatafnSchema>;
type PushHook = (response: Response) => Response | Promise<Response>;

const remote = "https://datafn.test/datafn";
const namespace = "user:clone-up-pulled-records-test";
const noteId = "node:clone-up-note";

let server: DatafnServer | undefined;
const clients: NucleumClient[] = [];

/** Starts an in-memory DataFn server for the Nucleum schema. */
async function startServer() {
  server = await createDatafnServer({
    schema: nucleumDatafnSchema,
    database: memoryAdapter({ debug: false }),
    authorize: () => true,
    namespaceProvider: {
      getNamespace: () => namespace,
      getActorId: () => "actor:clone-up-pulled-records-test"
    }
  });
  return server;
}

/** Sync config that routes requests to the server; `onPush` sees push responses. */
function syncConfig(target: DatafnServer, onPush?: PushHook): DatafnSyncConfig {
  return {
    mode: "sync",
    remote,
    offlinability: true,
    ws: false,
    http: {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const response = await target.router.handle(request);
        const isPush = new URL(request.url).pathname.endsWith("/push");
        return isPush && onPush ? onPush(response) : response;
      }
    }
  };
}

/** Creates a separate sync device for the same namespace. */
function createDevice(clientId: string, target: DatafnServer) {
  const client = createDatafnClient({
    schema: nucleumDatafnSchema,
    clientId,
    namespace,
    storage: new MemoryStorageAdapter(),
    sync: syncConfig(target)
  });
  clients.push(client);
  return client;
}

/**
 * Creates a note on device A, then switches Nucleum's DataFn runtime to a
 * second synced device that pulls the note into its own storage.
 */
async function pullNoteIntoNucleum(target: DatafnServer, onPush?: PushHook) {
  const deviceA = createDevice("device-a", target);
  const created = await deviceA.node.mutate({
    operation: "insert",
    id: noteId,
    record: {
      id: noteId,
      label: "Synced note",
      body: "",
      contentType: NodeType.SIMPLE_TEXT
    }
  });
  expect(created.ok).toBe(true);
  await deviceA.sync.schedulePush();

  const storage = new MemoryStorageAdapter();
  await datafn.switchContext({
    clientId: "device-b",
    namespace,
    storage,
    sync: syncConfig(target, onPush)
  });
  datafnRuntime.set({
    storage,
    namespace,
    storageDbName: null,
    product: Product.MEMOTRON,
    mode: "sync",
    remoteUrl: remote,
    bootResources: [],
    backgroundResources: [],
    destroy: async () => {
      datafn.sync.stop();
      await datafn.switchContext({
        sync: { mode: "local-only" },
        storage: null
      });
    }
  });
  await datafn.sync.pullNow();
  const pulled = await storage.getRecord("node", noteId);
  expect(pulled).toMatchObject({ label: "Synced note" });
  expect(pulled).toHaveProperty("isAncestorInactive", false);
  return storage;
}

describe("DataFn clone-up of records pulled from sync", () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) client.sync.stop();
    await destroyNucleumDatafn();
    await server?.close();
    server = undefined;
  });

  it("uploads a pulled node without its read-only ancestor flag", async () => {
    const target = await startServer();
    const pushStatuses: number[] = [];
    const storage = await pullNoteIntoNucleum(target, (response) => {
      pushStatuses.push(response.status);
      return response;
    });
    await storage.upsertRecord("node", {
      ...(await storage.getRecord("node", noteId)),
      label: "Rewritten by clone-up"
    });

    await cloneUpAllDatafnData();

    expect(pushStatuses.length).toBeGreaterThan(0);
    expect(pushStatuses.every((status) => status === 200)).toBe(true);
    const deviceC = createDevice("device-c", target);
    await deviceC.sync.start();
    await deviceC.sync.pullNow();
    const remoteNote = await deviceC.node.query({
      select: ["id", "label"],
      filters: { id: noteId }
    });
    expect(remoteNote.data).toEqual([
      expect.objectContaining({ id: noteId, label: "Rewritten by clone-up" })
    ]);
  });

  it("fails when the server rejects the clone-up push", async () => {
    const target = await startServer();
    let rejectPush = false;
    await pullNoteIntoNucleum(target, (response) =>
      rejectPush
        ? Response.json({
            ok: false,
            error: { code: "DFQL_INVALID", message: "Push rejected" }
          })
        : response
    );
    rejectPush = true;

    await expect(cloneUpAllDatafnData()).rejects.toThrow(
      "DataFn clone-up was rejected: DFQL_INVALID Push rejected"
    );
  });
});

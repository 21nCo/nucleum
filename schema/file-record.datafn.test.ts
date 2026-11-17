import { afterEach, describe, expect, it } from "vitest";
import {
  createDatafnClient,
  MemoryStorageAdapter,
  type DatafnClient
} from "@datafn/client";
import { createDatafnServer, type DatafnServer } from "@datafn/server";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import { nucleumDatafnSchema } from "./datafn";

type NucleumClient = DatafnClient<typeof nucleumDatafnSchema>;

const remote = "https://datafn.test/datafn";
const namespace = "user:file-record-test";
const processing = {
  mode: "local",
  artifacts: {
    thumbnail: { durationMs: 42 },
    text: { durationMs: 180 }
  }
};

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
      getActorId: () => "actor:file-record-test"
    }
  });
  return server;
}

/** Creates an offline-capable device client that syncs through the server router. */
function createDevice(clientId: string, target: DatafnServer) {
  const client = createDatafnClient({
    schema: nucleumDatafnSchema,
    clientId,
    namespace,
    storage: new MemoryStorageAdapter(),
    sync: {
      mode: "sync",
      remote,
      offlinability: true,
      ws: false,
      http: {
        fetch: (input, init) => target.router.handle(new Request(input, init))
      }
    }
  });
  clients.push(client);
  return client;
}

/** Reads one file record from a device's local store. */
async function readFile(client: NucleumClient, id: string) {
  const result = (await client.table("file").query({
    filters: { id }
  })) as { data?: Record<string, unknown>[] };
  return result.data?.[0];
}

describe("DataFn file record", () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) client.sync.stop();
    await server?.close();
    server = undefined;
  });

  it("declares optional fileId and processing fields", () => {
    const file = nucleumDatafnSchema.resources.find(
      (resource) => resource.name === "file"
    );
    expect(file?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "fileId",
          type: "string",
          required: false
        }),
        expect.objectContaining({
          name: "processing",
          type: "object",
          required: false
        })
      ])
    );
  });

  it("round-trips fileId and processing between devices through sync", async () => {
    const target = await startServer();
    const writer = createDevice("device-writer", target);
    const reader = createDevice("device-reader", target);
    const id = "file:filefn-round-trip";

    await writer.table("file").mutate({
      operation: "insert",
      id,
      record: {
        id,
        label: "Scan",
        type: "application/pdf",
        size: 2048,
        name: "scan.pdf",
        fileId: "ff_01JFILEFNROUNDTRIP",
        processing,
        metadata: { pages: 3 }
      }
    });
    await writer.sync.schedulePush();
    await reader.sync.start();
    await reader.sync.pullNow();

    expect(await readFile(reader, id)).toEqual(
      expect.objectContaining({
        id,
        name: "scan.pdf",
        type: "application/pdf",
        size: 2048,
        fileId: "ff_01JFILEFNROUNDTRIP",
        processing,
        metadata: { pages: 3 }
      })
    );
  });

  it.each([
    ["processing", "local", "expects object, got string"],
    ["processing", ["thumbnail"], "expects object, got array"],
    ["fileId", 7, "expects string, got number"]
  ])("rejects a file record whose %s is %j", async (field, value, message) => {
    const target = await startServer();
    const response = await target.router.handle(
      new Request(`${remote}/mutation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resource: "file",
          version: 1,
          operation: "insert",
          id: "file:malformed",
          clientId: "device-malformed",
          mutationId: "file-malformed-insert",
          record: { type: "image/png", size: 1, [field]: value }
        })
      })
    );
    const body = (await response.json()) as {
      ok: boolean;
      error?: { message?: string; details?: { path?: string } };
    };

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.message).toContain(message);
    expect(body.error?.details?.path).toBe(`$.record.${field}`);
  });

  it("keeps file records without FileFn fields valid", async () => {
    const target = await startServer();
    const writer = createDevice("device-legacy-writer", target);
    const reader = createDevice("device-legacy-reader", target);
    const id = "file:legacy-record";

    await writer.table("file").mutate({
      operation: "insert",
      id,
      record: {
        id,
        label: "Legacy",
        type: "image/png",
        size: 512,
        name: "legacy.png"
      }
    });
    await writer.sync.schedulePush();
    await reader.sync.start();
    await reader.sync.pullNow();

    const stored = await readFile(reader, id);
    expect(stored).toEqual(
      expect.objectContaining({ id, name: "legacy.png", size: 512 })
    );
    expect(stored?.fileId ?? null).toBeNull();
    expect(stored?.processing ?? null).toBeNull();
  });
});

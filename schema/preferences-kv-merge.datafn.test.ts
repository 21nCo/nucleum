import { afterEach, describe, expect, it } from "vitest";
import {
  createDatafnClient,
  MemoryStorageAdapter,
  type DatafnClient
} from "@datafn/client";
import { createDatafnServer, type DatafnServer } from "@datafn/server";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import { nucleumDatafnSchema } from "./datafn";
import { Resource } from "./resource.enum";

type NucleumClient = DatafnClient<typeof nucleumDatafnSchema>;

const remote = "https://datafn.test/datafn";
const namespace = "user:preferences-kv-merge-test";

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
      getActorId: () => "actor:preferences-kv-merge-test"
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

describe("DataFn preferences KV merge", () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) client.sync.stop();
    await server?.close();
    server = undefined;
  });

  it("keeps every partially merged preference across devices after sync", async () => {
    const target = await startServer();
    const deviceA = createDevice("device-a", target);
    const expected = {
      theme: "dark",
      fontSize: 16,
      sidebar: { collapsed: true }
    };

    for (const [key, value] of Object.entries(expected)) {
      const result = await deviceA.kv.merge(Resource.preferences, {
        [key]: value
      });
      expect(result.ok).toBe(true);
    }
    await deviceA.sync.schedulePush();

    const deviceB = createDevice("device-b", target);
    await deviceB.sync.start();
    await deviceB.sync.pullNow();
    expect(await deviceB.kv.get(Resource.preferences)).toEqual(expected);

    await deviceA.sync.pullNow();
    expect(await deviceA.kv.get(Resource.preferences)).toEqual(expected);
  });
});

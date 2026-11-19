import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createDatafnClient, MemoryStorageAdapter } from "@datafn/client";
import { createDatafnServer, type DatafnServer } from "@datafn/server";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import { nucleumDatafnSchema } from "@nucleum/schema/datafn";
import { pullAccountFileRecords } from "./filefn-client";

const remote = "https://datafn.test/datafn";
const namespace = "user:pull-test";

let server: DatafnServer | undefined;
const stops: (() => void)[] = [];

/**
 * An in-memory DataFn server for the Nucleum schema, counting its pulls. The
 * first pull answers only once `firstPull` settles, when given.
 */
async function startServer(
  options: { isFailing?: () => boolean; firstPull?: Promise<void> } = {}
) {
  const target = await createDatafnServer({
    schema: nucleumDatafnSchema,
    database: memoryAdapter({ debug: false }),
    authorize: () => true,
    namespaceProvider: {
      getNamespace: () => namespace,
      getActorId: () => "actor:pull-test"
    }
  });
  server = target;
  const pulls: Promise<unknown>[] = [];
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (!new URL(request.url).pathname.endsWith("/pull")) {
      return target.router.handle(request);
    }
    if (options.isFailing?.()) {
      const failed = Promise.resolve(new Response("down", { status: 503 }));
      pulls.push(failed);
      return failed;
    }
    const held = pulls.length === 0 ? options.firstPull : undefined;
    const pulled = (held ?? Promise.resolve()).then(() =>
      target.router.handle(request)
    );
    pulls.push(pulled);
    return pulled;
  };
  return { fetch, pulls };
}

/**
 * A device syncing with the server, holding its own copy of the records, that
 * pulls at most `pullBatchSize` changes `maxPullIterations` times per pull.
 */
function createDevice(
  clientId: string,
  fetch: typeof globalThis.fetch,
  limits: { pullBatchSize?: number; maxPullIterations?: number } = {},
  storage = new MemoryStorageAdapter()
) {
  const client = createDatafnClient({
    schema: nucleumDatafnSchema,
    clientId,
    namespace,
    storage,
    sync: {
      mode: "sync",
      remote,
      offlinability: true,
      ws: false,
      http: { fetch },
      ...limits
    }
  });
  stops.push(() => client.sync.stop());
  return client;
}

async function insertFile(
  client: ReturnType<typeof createDevice>,
  id: string,
  fileId: string
) {
  await client.table("file").mutate({
    operation: "insert",
    id,
    record: {
      id,
      label: "Photo",
      type: "image/png",
      size: 11,
      name: "photo.png",
      fileId
    }
  });
  await client.sync.schedulePush();
}

async function hasFile(
  client: ReturnType<typeof createDevice>,
  fileId: string
) {
  const result = (await client.table("file").query({
    filters: { fileId }
  })) as { data?: unknown[] };
  return (result.data?.length ?? 0) > 0;
}

afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await server?.close();
  server = undefined;
});

describe("pulling an account's file records before its queue replays", () => {
  it("resolves once a pull has brought the file records another device saved", async () => {
    const { fetch } = await startServer();
    const writer = createDevice("device-writer", fetch);
    const reader = createDevice("device-reader", fetch);
    await insertFile(writer, "file:pulled", "file_pulledPhoto01");

    const isPulled = await pullAccountFileRecords(
      reader,
      () => true,
      new AbortController().signal
    );

    expect(isPulled).toBe(true);
    expect(await hasFile(reader, "file_pulledPhoto01")).toBe(true);
  });

  it("waits out a pull already running and pulls again, as the running pull may have read the records before the call", async () => {
    let releaseFirstPull!: () => void;
    const { fetch, pulls } = await startServer({
      firstPull: new Promise((resolve) => (releaseFirstPull = resolve))
    });
    const writer = createDevice("device-writer", fetch);
    const reader = createDevice("device-reader", fetch);
    const running = reader.sync.pullNow();
    await insertFile(writer, "file:later", "file_laterPhoto01");

    const pulled = pullAccountFileRecords(
      reader,
      () => true,
      new AbortController().signal
    );
    releaseFirstPull();
    const isPulled = await pulled;
    await running;

    expect(isPulled).toBe(true);
    expect(pulls.length).toBeGreaterThanOrEqual(2);
    expect(await hasFile(reader, "file_laterPhoto01")).toBe(true);
  });

  it("resolves only once the file records are fully caught up when one pull stops at its batch limit", async () => {
    const { fetch } = await startServer();
    const writer = createDevice("device-writer", fetch);
    const stored = new MemoryStorageAdapter();
    const reader = createDevice(
      "device-reader",
      fetch,
      { pullBatchSize: 10, maxPullIterations: 1 },
      stored
    );
    await insertFile(writer, "file:first", "file_firstPhoto01");
    expect(
      await pullAccountFileRecords(
        reader,
        () => true,
        new AbortController().signal
      )
    ).toBe(true);
    for (let index = 1; index <= 25; index++) {
      await insertFile(writer, `file:batch${index}`, `file_batchPhoto${index}`);
    }

    const isPulled = await pullAccountFileRecords(
      reader,
      () => true,
      new AbortController().signal
    );

    expect(isPulled).toBe(true);
    expect(await stored.countRecords("file")).toBe(26);
  });

  it("resolves false when the pull fails", async () => {
    const { fetch } = await startServer({ isFailing: () => true });
    const reader = createDevice("device-reader", fetch);

    expect(
      await pullAccountFileRecords(
        reader,
        () => true,
        new AbortController().signal
      )
    ).toBe(false);
  });

  it("resolves false without pulling when the records are not the account's", async () => {
    const { fetch, pulls } = await startServer();
    const reader = createDevice("device-reader", fetch);

    expect(
      await pullAccountFileRecords(
        reader,
        () => false,
        new AbortController().signal
      )
    ).toBe(false);
    expect(pulls).toEqual([]);
  });

  it("resolves false when the replay is torn down while it waits", async () => {
    const { fetch } = await startServer();
    const reader = createDevice("device-reader", fetch);
    const teardown = new AbortController();

    const pulled = pullAccountFileRecords(reader, () => true, teardown.signal);
    teardown.abort();

    expect(await pulled).toBe(false);
  });
});

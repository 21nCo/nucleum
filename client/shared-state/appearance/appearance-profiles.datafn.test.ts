import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDatafnClient,
  MemoryStorageAdapter,
  type DatafnClient
} from "@datafn/client";
import { createDatafnServer, type DatafnServer } from "@datafn/server";
import { memoryAdapter } from "@superfunctions/db/adapters/memory";
import { nucleumDatafnSchema } from "@nucleum/schema/datafn";
import { Resource } from "@nucleum/schema/resource.enum";
import { AppStyle } from "@21n/theme/app-style";
import {
  resolveAppearanceProfiles,
  resolveDeleteProfilePatch,
  resolveProfileEntryPatch,
  resolveSaveProfilePatch,
  snapshotAppearance
} from "./appearance-profiles";
import { seedUserPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";

type NucleumClient = DatafnClient<typeof nucleumDatafnSchema>;

const remote = "https://datafn.test/datafn";
const namespace = "user:appearance-profiles-sync-test";

let server: DatafnServer | undefined;
const devices: NucleumClient[] = [];

async function startServer() {
  server = await createDatafnServer({
    schema: nucleumDatafnSchema,
    database: memoryAdapter({ debug: false }),
    authorize: () => true,
    namespaceProvider: {
      getNamespace: () => namespace,
      getActorId: () => "actor:appearance-profiles-sync-test"
    }
  });
  return server;
}

function createDevice(clientId: string, target: DatafnServer) {
  const device = createDatafnClient({
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
  devices.push(device);
  return device;
}

async function read(device: NucleumClient) {
  return ((await device.kv.get(Resource.globalPreferences)) ??
    {}) as IUserGlobalPreferences;
}

async function write(
  device: NucleumClient,
  patch: Partial<IUserGlobalPreferences>
) {
  const result = await device.kv.merge(Resource.globalPreferences, patch);
  expect(result.ok).toBe(true);
  await device.sync.schedulePush();
  // schedulePush only queues the push, so wait until the server acknowledged it.
  await vi.waitFor(async () =>
    expect((await device.sync.refreshStatus()).pendingChanges).toBe(0)
  );
}

async function pull(device: NucleumClient) {
  await device.sync.start();
  await device.sync.pullNow();
}

const userProfileNames = (preferences: IUserGlobalPreferences) =>
  resolveAppearanceProfiles(preferences)
    .filter((profile) => !profile.isBuiltIn)
    .map((profile) => profile.name);

describe("appearance profiles sync", () => {
  afterEach(async () => {
    for (const device of devices.splice(0)) device.sync.stop();
    await server?.close();
    server = undefined;
  });

  it("keeps profiles and the applied id across devices after a later appearance write, and syncs deletions", async () => {
    const target = await startServer();
    const deviceA = createDevice("device-a", target);
    const settings = snapshotAppearance({
      ...seedUserPreferences.appearance,
      appStyle: AppStyle.Rounded
    });

    await write(
      deviceA,
      resolveSaveProfilePatch(
        await read(deviceA),
        "night",
        "Night",
        settings,
        1
      )
    );
    await write(deviceA, {
      appearance: {
        ...seedUserPreferences.appearance,
        appStyle: AppStyle.Boxed
      }
    });

    const deviceB = createDevice("device-b", target);
    await pull(deviceB);
    const synced = await read(deviceB);
    expect(userProfileNames(synced)).toEqual(["Night"]);
    expect(synced.appliedAppearanceProfileId).toBe("night");
    expect(synced.appearance?.appStyle).toBe(AppStyle.Boxed);

    await write(
      deviceB,
      resolveDeleteProfilePatch(await read(deviceB), "night")
    );
    await pull(deviceA);
    const afterDelete = await read(deviceA);
    expect(userProfileNames(afterDelete)).toEqual([]);
    expect(afterDelete.appliedAppearanceProfileId).toBeNull();
  });

  it("keeps edits to different profiles made on two devices in turn", async () => {
    const target = await startServer();
    const deviceA = createDevice("device-a", target);
    const settings = snapshotAppearance(seedUserPreferences.appearance);
    await write(
      deviceA,
      resolveSaveProfilePatch(await read(deviceA), "day", "Day", settings, 1)
    );
    await write(
      deviceA,
      resolveSaveProfilePatch(
        await read(deviceA),
        "night",
        "Night",
        settings,
        2
      )
    );

    const deviceB = createDevice("device-b", target);
    await pull(deviceB);
    const onB = await read(deviceB);
    await write(
      deviceB,
      resolveProfileEntryPatch(onB, "day", {
        ...onB.appearanceProfiles!.day!,
        name: "Morning"
      })
    );

    await pull(deviceA);
    const onA = await read(deviceA);
    await write(
      deviceA,
      resolveProfileEntryPatch(onA, "night", {
        ...onA.appearanceProfiles!.night!,
        name: "Evening"
      })
    );

    await pull(deviceB);
    expect(userProfileNames(await read(deviceB))).toEqual([
      "Morning",
      "Evening"
    ]);
  });
});

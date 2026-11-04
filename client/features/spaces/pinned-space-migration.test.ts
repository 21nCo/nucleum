import { beforeEach, describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import type { IAppMenu } from "@nucleum/shell/navigation/app-menu.type";
import type { ISpace } from "@nucleum/features/spaces/space.type";

const state = vi.hoisted(() => ({
  namespace: "account-1" as string | undefined,
  menus: {} as Record<string, IAppMenu>,
  tabs: [] as string[],
  spaces: new Map<string, Record<string, unknown>>(),
  records: new Map<string, Record<string, unknown>>(),
  isInsertFailing: false
}));

const insertSpace = vi.hoisted(() =>
  vi.fn(async (params: { id: string; label: string; items: unknown[] }) => {
    if (state.isInsertFailing) return undefined;
    state.spaces.set(params.id, { ...params });
    return params.id;
  })
);
const reloadActiveSpace = vi.hoisted(() => vi.fn(async () => undefined));
const spaceMutate = vi.hoisted(() =>
  vi.fn(async (params: { id: string; record: Record<string, unknown> }) => {
    state.spaces.set(params.id, {
      ...state.spaces.get(params.id),
      ...params.record
    });
    return { ok: true };
  })
);

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() }
}));
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    currentNamespace: () => state.namespace,
    space: {
      select: async (id: string) => state.spaces.get(id),
      mutate: spaceMutate
    },
    table: () => ({
      select: async (id: string) => state.records.get(id)
    })
  }
}));
vi.mock("@nucleum/shell/navigation/app-menu.store", () => ({
  appMenuStore: {
    read: async () => structuredClone(state.menus),
    modify: async (patch: Record<string, IAppMenu>) => {
      state.menus = { ...state.menus, ...structuredClone(patch) };
      return { ok: true };
    }
  }
}));
vi.mock("@nucleum/shell/topNav/tabs/tabs.store", () => ({
  tabs: {
    read: async () => [...state.tabs],
    rearrange: async (ids: string[]) => {
      state.tabs = [...ids];
      return { ok: true };
    }
  }
}));
const appendSpaceItems = vi.hoisted(() =>
  vi.fn(async (id: string, items: unknown[], savedItems: unknown[]) => {
    state.spaces.set(id, {
      ...state.spaces.get(id),
      items: [...savedItems, ...items]
    });
    return true;
  })
);
vi.mock("@nucleum/features/spaces/space.store", () => ({
  appendSpaceItems,
  insertSpace,
  reloadActiveSpace
}));
vi.mock("@nucleum/shared-state/app-context/app.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    appStore: writable({ product: Product.NUCLEUM, actions: [] })
  };
});

const { migratePinnedSpace } =
  await import("@nucleum/features/spaces/pinned-space-migration");

const resolveTypePinPage = (pin: string) => ({
  path: `library/${pin}/all`,
  label: `Library > ${pin}`
});

function migrate() {
  return migratePinnedSpace({ resolveTypePinPage });
}

function menu() {
  return state.menus[Product.NUCLEUM] ?? {};
}

function onlySpace() {
  const [entry] = [...state.spaces.entries()];
  return { id: entry?.[0], space: entry?.[1] as ISpace | undefined };
}

beforeEach(() => {
  state.namespace = "account-1";
  state.menus = { [Product.NUCLEUM]: { user: ["objective"] } };
  state.tabs = ["node:a", "node:missing"];
  state.spaces = new Map();
  state.records = new Map([["node:a", { id: "node:a", label: "Page A" }]]);
  state.isInsertFailing = false;
  insertSpace.mockClear();
  reloadActiveSpace.mockClear();
  spaceMutate.mockClear();
});

describe("migratePinnedSpace", () => {
  it("moves tabs and pins into a new pinned space and pins it", async () => {
    await migrate();

    const { id, space } = onlySpace();
    expect(space?.label).toBe("Pinned");
    expect(
      space?.items?.map((item) =>
        "resourceId" in item ? item.resourceId : item.path
      )
    ).toEqual(["node:a", "library/objective/all"]);
    expect(state.tabs).toEqual(["node:missing"]);
    expect(menu()).toMatchObject({
      user: [],
      spaces: [id],
      pinnedSpaceId: id,
      tabsMigrated: true
    });
    expect(menu().pinnedSpacePinPending).toBeUndefined();
  });

  it("does nothing more when run again", async () => {
    await migrate();
    const before = structuredClone({
      menus: state.menus,
      tabs: state.tabs,
      space: onlySpace().space
    });
    insertSpace.mockClear();
    spaceMutate.mockClear();

    await migrate();

    expect(insertSpace).not.toHaveBeenCalled();
    expect(spaceMutate).not.toHaveBeenCalled();
    expect({
      menus: state.menus,
      tabs: state.tabs,
      space: onlySpace().space
    }).toEqual(before);
  });

  it("keeps tabs and pins when the space cannot be created, and reuses its id later", async () => {
    state.isInsertFailing = true;
    await migrate();

    expect(state.spaces.size).toBe(0);
    expect(state.tabs).toEqual(["node:a", "node:missing"]);
    expect(menu().user).toEqual(["objective"]);
    expect(menu().tabsMigrated).toBeUndefined();
    expect(menu().pinnedSpacePinPending).toBe(true);
    const pendingId = menu().pinnedSpaceId;

    state.isInsertFailing = false;
    await migrate();

    expect(onlySpace().id).toBe(pendingId);
    expect(menu().spaces).toEqual([pendingId]);
    expect(state.tabs).toEqual(["node:missing"]);
  });

  it("appends new pins to an existing pinned space and reloads its open view", async () => {
    await migrate();
    const { id } = onlySpace();
    state.menus[Product.NUCLEUM].user = ["collection"];

    await migrate();

    expect(
      onlySpace().space?.items?.map((item) =>
        "resourceId" in item ? item.resourceId : item.path
      )
    ).toEqual(["node:a", "library/objective/all", "library/collection/all"]);
    expect(reloadActiveSpace).toHaveBeenLastCalledWith(id);
    expect(menu().user).toEqual([]);
  });

  it("keeps pins when the appended links are not in the saved space", async () => {
    await migrate();
    const { id } = onlySpace();
    const savedItems = onlySpace().space?.items;
    state.menus[Product.NUCLEUM].user = ["collection"];
    appendSpaceItems.mockImplementationOnce(async () => {
      state.spaces.set(id!, { ...state.spaces.get(id!), items: savedItems });
      return true;
    });

    await migrate();

    expect(menu().user).toEqual(["collection"]);
  });

  it("keeps pins while the recorded pinned space has not reached this device", async () => {
    state.menus = {
      [Product.NUCLEUM]: {
        user: ["objective"],
        pinnedSpaceId: "space:remote",
        tabsMigrated: true,
        spaces: ["space:remote"]
      }
    };

    await migrate();

    expect(insertSpace).not.toHaveBeenCalled();
    expect(spaceMutate).not.toHaveBeenCalled();
    expect(menu().user).toEqual(["objective"]);
  });

  it("keeps a pending pin while the recorded pinned space has not reached this device", async () => {
    state.tabs = [];
    state.menus = {
      [Product.NUCLEUM]: {
        pinnedSpaceId: "space:remote",
        pinnedSpacePinPending: true
      }
    };

    await migrate();

    expect(menu()).toMatchObject({
      pinnedSpaceId: "space:remote",
      pinnedSpacePinPending: true,
      tabsMigrated: true
    });
  });

  it("stops without writing when the account changes during a run", async () => {
    state.namespace = "account-1";
    const run = migrate();
    state.namespace = "account-2";
    await run;

    expect(insertSpace).not.toHaveBeenCalled();
    expect(state.tabs).toEqual(["node:a", "node:missing"]);
    expect(menu().user).toEqual(["objective"]);
  });
});

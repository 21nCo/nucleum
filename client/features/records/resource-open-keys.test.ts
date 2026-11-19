import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import type { INode } from "@nucleum/features/memory/node/node.type";
import type { IObjectiveThumb } from "@nucleum/features/focus/goals/goal.type";
import type { ICollection } from "@nucleum/features/collections/collection.type";
import view from "@21n/ui/environment/view.store";
import context from "@nucleum/client/runtime/context.store";
import { Embed } from "@nucleum/client/runtime/context.type";
import {
  configureResourceActionHost,
  type ResourceActionHost
} from "@nucleum/shared-state/resources/resource-action-host";
import {
  BASE_CONTEXT_ZONE_PANE,
  ContextZoneLayer,
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { resolveNodeContextMenu } from "@nucleum/features/memory/node/node.store";
import { resolveObjectiveContextMenu } from "@nucleum/features/focus/goals/goal.store";
import { resolveCollectionContextMenu } from "@nucleum/features/collections/collection.store";
import { registerNoteEditorFocus } from "@nucleum/features/memory/markdown/note-editor-focus";
import ContextActionKeys from "@nucleum/surfaces/commandBar/ContextActionKeys.svelte";
import { withResourceActionKeys } from "./resource-action-keys";

const NOTE_ID = "node:open-keys-note";
const IMAGE_ID = "node:open-keys-image";
const OBJECTIVE_ID = "objective:open-keys";
const COLLECTION_ID = "collection:open-keys";

const PAGE_PANE: ContextZonePane = { id: "page", layer: ContextZoneLayer.PAGE };
const SPLIT_PANE: ContextZonePane = {
  id: "beside-base",
  layer: ContextZoneLayer.BESIDE_BASE
};

const note = (overrides: Record<string, unknown> = {}) =>
  ({
    id: NOTE_ID,
    label: "Open keys",
    contentType: NodeType.NODULAR_MARKDOWN,
    isStarred: false,
    ...overrides
  }) as unknown as INode;

const image = () =>
  ({
    id: IMAGE_ID,
    label: "Open keys image",
    contentType: NodeType.IMAGE,
    isStarred: false
  }) as unknown as INode;

const objective = () =>
  ({
    id: OBJECTIVE_ID,
    label: "Open keys objective",
    isStarred: false
  }) as unknown as IObjectiveThumb;

const collection = () =>
  ({
    id: COLLECTION_ID,
    label: "Open keys collection",
    isStarred: false
  }) as unknown as ICollection;

type Mode = "page" | "split" | "split beside a page" | "in place";

/** The menu's access mode for each mode, as the resource's views pass it. */
const ACCESS_MODES: Record<Mode, AccessMode | undefined> = {
  page: AccessMode.PAGE,
  split: AccessMode.BESIDE_BASE,
  "split beside a page": AccessMode.BESIDE_PAGE,
  "in place": undefined
};

/**
 * Shows the resource in a mode, as the address bar records it. A split
 * opened from a page goes beside that page, here the same resource's page.
 */
function showIn(mode: Mode, id: string) {
  const param = encodeURIComponent(id);
  const query = {
    page: `/?page=${param}`,
    split: `/?beside=${param}`,
    "split beside a page": `/?page=${param}&besidePage=${param}`,
    "in place": `/collection_browse?selected=${param}`
  }[mode];
  window.history.replaceState({}, "", query);
}

const resolvers = {
  note: (mode: Mode) =>
    resolveNodeContextMenu(note(), ResourceAccessPoint.SELF, {
      accessMode: ACCESS_MODES[mode]
    }),
  objective: (_mode: Mode) =>
    resolveObjectiveContextMenu(objective(), ResourceAccessPoint.SELF),
  collection: (mode: Mode) =>
    resolveCollectionContextMenu(collection(), ResourceAccessPoint.SELF, {
      accessMode: ACCESS_MODES[mode]
    })
};

const IDS = {
  note: NOTE_ID,
  objective: OBJECTIVE_ID,
  collection: COLLECTION_ID
};

function keyedItems(menu: IContextMenu) {
  return withResourceActionKeys(menu).flatMap((group) => group.items);
}

function findItem(menu: IContextMenu, value: string) {
  return keyedItems(menu).find((item) => item.value === value);
}

function openGroupValues(menu: IContextMenu) {
  return menu
    .find((group) => group.group === "open")
    ?.items.map((item) => item.value);
}

const initialContext = get(context);

function landscape() {
  view.refresh(1280, 800);
}

/** A portrait view wide enough that the width alone hides no menu group. */
function portrait() {
  view.refresh(900, 1400);
}

afterEach(() => {
  window.history.replaceState({}, "", "/");
  context.set(initialContext);
  landscape();
});

describe("B on an open resource's own menu", () => {
  beforeEach(landscape);

  it.each([
    ["note", "page"],
    ["note", "in place"],
    ["objective", "page"],
    ["objective", "in place"],
    ["collection", "page"],
    ["collection", "in place"]
  ] as const)(
    "offers Open in split screen with B before Maximize on a %s open %s in landscape",
    (resource, mode) => {
      showIn(mode, IDS[resource]);
      const menu = resolvers[resource](mode);
      const item = findItem(menu, "open-as-split");
      expect(item?.label).toBe("Open in split screen");
      expect(item?.hotKey).toBe("b");
      expect(openGroupValues(menu)).toEqual([
        "open-as-split",
        "open-in-full-screen"
      ]);
    }
  );

  it.each([
    ["note", "split"],
    ["note", "split beside a page"],
    ["objective", "split"],
    ["objective", "split beside a page"],
    ["collection", "split"],
    ["collection", "split beside a page"]
  ] as const)(
    "offers Close split screen with B on a %s open in a %s",
    (resource, mode) => {
      showIn(mode, IDS[resource]);
      const item = findItem(resolvers[resource](mode), "open-as-split");
      expect(item?.label).toBe("Close split screen");
      expect(item?.hotKey).toBe("b");
    }
  );

  it.each(["note", "objective", "collection"] as const)(
    "offers no split item on a %s open in place in portrait",
    (resource) => {
      portrait();
      showIn("in place", IDS[resource]);
      expect(
        findItem(resolvers[resource]("in place"), "open-as-split")
      ).toBeUndefined();
    }
  );

  it("offers no split item on an objective open as a page in portrait", () => {
    portrait();
    showIn("page", OBJECTIVE_ID);
    expect(
      findItem(resolvers.objective("page"), "open-as-split")
    ).toBeUndefined();
  });

  it.each(["note", "objective", "collection"] as const)(
    "offers no split item on a %s in a handset embed",
    (resource) => {
      context.set({ ...initialContext, isEmbed: true, embed: Embed.HANDSET });
      showIn("page", IDS[resource]);
      expect(
        findItem(resolvers[resource]("page"), "open-as-split")
      ).toBeUndefined();
    }
  );
});

describe("E on an open note's own menu", () => {
  beforeEach(landscape);

  const editItem = (menu: IContextMenu): IContextMenuItem | undefined =>
    findItem(menu, "edit");

  it.each([
    ["a page", AccessMode.PAGE],
    ["a split", AccessMode.BESIDE_BASE],
    ["a split beside a page", AccessMode.BESIDE_PAGE]
  ])(
    "offers Edit with E on a markdown note open as %s",
    (_name, accessMode) => {
      const item = editItem(
        resolveNodeContextMenu(note(), ResourceAccessPoint.SELF, { accessMode })
      );
      expect(item?.label).toBe("Edit");
      expect(item?.hotKey).toBe("e");
    }
  );

  it.each([
    ["in read mode", { isInReadOnlyMode: true }],
    ["locked", { isLocked: true }],
    ["archived", { isArchived: true }],
    ["in trash", { trashedAt: "2026-11-19T00:00:00.000Z" }]
  ])("offers no Edit on a markdown note %s", (_name, overrides) => {
    for (const accessMode of [AccessMode.PAGE, AccessMode.BESIDE_BASE])
      expect(
        editItem(
          resolveNodeContextMenu(note(overrides), ResourceAccessPoint.SELF, {
            accessMode
          })
        )
      ).toBeUndefined();
  });
});

describe("B and E through the page letters", () => {
  const host = {
    copyLink: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    maximize: vi.fn(),
    requestLink: vi.fn(),
    afterNodeMutation: vi.fn()
  } satisfies ResourceActionHost;
  let release: (() => void)[] = [];

  async function press(key: string) {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, cancelable: true })
    );
    for (let index = 0; index < 5; index++) await tick();
  }

  /** Registers an open resource's keyed menu in a pane and works there. */
  function openIn(
    pane: ContextZonePane,
    id: string,
    resolve: () => IContextMenu
  ) {
    release.push(
      contextActions.register(pane, {
        id,
        resource: id.split(":")[0],
        resolve: () => withResourceActionKeys(resolve())
      })
    );
    contextZone.activatePane(pane.id);
  }

  beforeEach(() => {
    landscape();
    vi.clearAllMocks();
    configureResourceActionHost(host);
    release.push(contextZone.host());
    for (const pane of [BASE_CONTEXT_ZONE_PANE, SPLIT_PANE, PAGE_PANE])
      release.push(contextZone.registerPane(pane));
    const keys = render(ContextActionKeys);
    release.push(() => keys.unmount());
  });

  afterEach(() => {
    release.reverse().forEach((unregister) => unregister());
    release = [];
    for (const pane of [PAGE_PANE, SPLIT_PANE, BASE_CONTEXT_ZONE_PANE])
      contextZone.releasePane(pane.id);
  });

  it.each(["note", "objective", "collection"] as const)(
    "opens a %s page beside the base with B",
    async (resource) => {
      showIn("page", IDS[resource]);
      openIn(PAGE_PANE, IDS[resource], () => resolvers[resource]("page"));

      await press("b");

      expect(host.open).toHaveBeenCalledWith(
        IDS[resource],
        AccessMode.BESIDE_BASE
      );
      expect(host.close).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["note", "split"],
    ["note", "split beside a page"],
    ["objective", "split"],
    ["objective", "split beside a page"],
    ["collection", "split"],
    ["collection", "split beside a page"]
  ] as const)("closes a %s %s with B", async (resource, mode) => {
    showIn(mode, IDS[resource]);
    openIn(SPLIT_PANE, IDS[resource], () => resolvers[resource](mode));

    await press("b");

    expect(host.close).toHaveBeenCalledWith({
      id: IDS[resource],
      accessMode: ACCESS_MODES[mode]
    });
    expect(host.open).not.toHaveBeenCalled();
  });

  it.each([
    ["page", PAGE_PANE, AccessMode.PAGE],
    ["split", SPLIT_PANE, AccessMode.BESIDE_BASE]
  ] as const)(
    "focuses only the %s pane's note editor with E",
    async (_name, pane, accessMode) => {
      const focused: string[] = [];
      for (const editorPane of [PAGE_PANE, SPLIT_PANE])
        release.push(
          registerNoteEditorFocus(NOTE_ID, editorPane.id, () =>
            focused.push(editorPane.id)
          )
        );
      openIn(pane, NOTE_ID, () =>
        resolveNodeContextMenu(note(), ResourceAccessPoint.SELF, {
          accessMode,
          paneId: pane.id
        })
      );

      await press("e");

      expect(focused).toEqual([pane.id]);
    }
  );

  it("leaves a read-only note's editor alone on E", async () => {
    const focus = vi.fn();
    release.push(registerNoteEditorFocus(NOTE_ID, PAGE_PANE.id, focus));
    openIn(PAGE_PANE, NOTE_ID, () =>
      resolveNodeContextMenu(
        note({ isInReadOnlyMode: true }),
        ResourceAccessPoint.SELF,
        { accessMode: AccessMode.PAGE, paneId: PAGE_PANE.id }
      )
    );

    await press("e");

    expect(focus).not.toHaveBeenCalled();
  });

  it("keeps E on a media note to its own edit mode, not a note editor", async () => {
    const focus = vi.fn();
    release.push(registerNoteEditorFocus(IMAGE_ID, PAGE_PANE.id, focus));
    openIn(PAGE_PANE, IMAGE_ID, () =>
      resolveNodeContextMenu(image(), ResourceAccessPoint.SELF, {
        accessMode: AccessMode.PAGE,
        paneId: PAGE_PANE.id
      })
    );

    await press("e");

    expect(focus).not.toHaveBeenCalled();
  });
});

describe("note editor focus registrations", () => {
  it("keeps a remounted editor's registration when the old one releases", () => {
    const first = vi.fn();
    const second = vi.fn();
    const releaseFirst = registerNoteEditorFocus(NOTE_ID, "page", first);
    const releaseSecond = registerNoteEditorFocus(NOTE_ID, "page", second);
    releaseFirst();
    const menu = resolveNodeContextMenu(note(), ResourceAccessPoint.SELF, {
      accessMode: AccessMode.PAGE,
      paneId: "page"
    });
    void findItem(menu, "edit")?.callback?.();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    releaseSecond();
    void findItem(menu, "edit")?.callback?.();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

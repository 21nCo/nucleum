import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import type { INode } from "@nucleum/features/memory/node/node.type";
import view from "@21n/ui/environment/view.store";
import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";
import {
  findFirstCaretBlockId,
  focusNoteEditor,
  registerNoteEditorFocus,
  reportNoteContentState,
  resolveNoteContentState,
  resolveUnmountedNoteContentState,
  runPendingNoteEditorFocus,
  type NoteContentState
} from "@nucleum/features/memory/markdown/note-editor-focus";

const NOTE_ID = "node:pane-edit-note";

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    node: {
      select: async () => ({
        id: "node:pane-edit-note",
        contentType: NodeType.NODULAR_MARKDOWN,
        title: "Pane edit"
      }),
      query: async () => ({ data: [] })
    }
  }
}));

const { ActiveNodeStore, resolveNodeContextMenu } = await import(
  "@nucleum/features/memory/node/node.store"
);

function editItemIn(node: INode, contentState: NoteContentState | undefined) {
  return withResourceActionKeys(
    resolveNodeContextMenu(node, ResourceAccessPoint.SELF, {
      accessMode: AccessMode.PAGE,
      paneId: `${contentState}-pane`,
      contentState
    })
  )
    .flatMap((group) => group.items)
    .find((item) => item.value === "edit");
}

describe("Edit on one note open in a complete pane and an incomplete pane", () => {
  beforeEach(() => view.refresh(1280, 800));

  it("stays in the complete pane only when the shared note store loads again", async () => {
    const store = new ActiveNodeStore(NOTE_ID as unknown as IRecordId);
    const load = () =>
      store.init({
        accessMode: AccessMode.PAGE,
        accessPoint: ResourceAccessPoint.SELF
      });

    await load();
    expect(editItemIn(store.get(), "ready")?.hotKey).toBe("e");
    expect(editItemIn(store.get(), "unavailable")).toBeUndefined();

    await load();
    expect(editItemIn(store.get(), "ready")?.hotKey).toBe("e");
    expect(editItemIn(store.get(), "unavailable")).toBeUndefined();
  });
});

describe("Edit while a pane's note content prepares its blocks", () => {
  it.each([
    [false, false, false, "preparing"],
    [false, true, false, "unavailable"],
    [false, false, true, "unavailable"],
    [true, false, false, "ready"],
    [true, true, false, "unavailable"]
  ] as const)(
    "content ready %s, opened incomplete %s, given up %s is %s",
    (isInitialContentReady, isOpenedIncomplete, isPreparationAbandoned, state) => {
      expect(
        resolveNoteContentState({
          isInitialContentReady,
          isOpenedIncomplete,
          isPreparationAbandoned
        })
      ).toBe(state);
    }
  );

  it("is offered only once the content is ready, never while it prepares or after it gave up", async () => {
    const store = new ActiveNodeStore(NOTE_ID as unknown as IRecordId);
    await store.init({
      accessMode: AccessMode.PAGE,
      accessPoint: ResourceAccessPoint.SELF
    });
    expect(editItemIn(store.get(), "preparing")).toBeUndefined();
    expect(editItemIn(store.get(), "unavailable")).toBeUndefined();
    expect(editItemIn(store.get(), "ready")?.hotKey).toBe("e");
  });

  it("is offered again once a content still preparing unmounts under a side panel or the cover picker", async () => {
    const store = new ActiveNodeStore(NOTE_ID as unknown as IRecordId);
    await store.init({
      accessMode: AccessMode.PAGE,
      accessPoint: ResourceAccessPoint.SELF
    });
    const kept = resolveUnmountedNoteContentState("preparing");
    expect(kept).toBeUndefined();
    expect(editItemIn(store.get(), kept)?.hotKey).toBe("e");
  });

  it("keeps a settled state when its content unmounts", () => {
    expect(resolveUnmountedNoteContentState("ready")).toBe("ready");
    expect(resolveUnmountedNoteContentState("unavailable")).toBe("unavailable");
    expect(resolveUnmountedNoteContentState(undefined)).toBeUndefined();
  });
});

describe("a focus request for a hidden editor whose content prepares slowly", () => {
  const PANE = "slow-pane";
  const TTL_MS = 3000;
  const release: (() => void)[] = [];
  let now = 0;

  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => {
    release.splice(0).forEach((stop) => stop());
    reportNoteContentState(NOTE_ID, PANE, "unavailable");
    vi.restoreAllMocks();
  });

  const request = (isNavigating: boolean) =>
    focusNoteEditor(NOTE_ID, PANE, () => ({ isNavigating }));

  it("focuses the editor once it shows after preparing longer than the request would wait", async () => {
    const focus = vi.fn();
    request(false);
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    now += 10 * TTL_MS;
    reportNoteContentState(NOTE_ID, PANE, "ready");
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    await tick();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("focuses the editor shown after its navigation settled and a long preparation", async () => {
    const focus = vi.fn();
    request(true);
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    expect(runPendingNoteEditorFocus(NOTE_ID, PANE)).toBe(false);
    now += 10 * TTL_MS;
    reportNoteContentState(NOTE_ID, PANE, "ready");
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    expect(runPendingNoteEditorFocus(NOTE_ID, PANE)).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("drops the request when the content opens incomplete or gives up", async () => {
    const focus = vi.fn();
    request(false);
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    reportNoteContentState(NOTE_ID, PANE, "unavailable");
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    await tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it("lets the request lapse once the preparing content unmounts", async () => {
    const focus = vi.fn();
    request(false);
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    now += 10 * TTL_MS;
    reportNoteContentState(NOTE_ID, PANE, undefined);
    now += TTL_MS + 1;
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    await tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it("is not revived by a later mount of the content once it has lapsed", async () => {
    const focus = vi.fn();
    request(false);
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    reportNoteContentState(NOTE_ID, PANE, undefined);
    now += TTL_MS + 1;
    reportNoteContentState(NOTE_ID, PANE, "preparing");
    now += 10 * TTL_MS;
    reportNoteContentState(NOTE_ID, PANE, "ready");
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    await tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it("still lapses when no content prepares for it", async () => {
    const focus = vi.fn();
    request(false);
    now += TTL_MS + 1;
    release.push(registerNoteEditorFocus(NOTE_ID, PANE, focus));
    await tick();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe("the block Edit puts the caret in", () => {
  const block = (id: string, contentType: NodeType, body?: unknown) => ({
    id: id as unknown as IRecordId,
    contentType,
    body
  });

  it("is the first text block after a divider", () => {
    expect(
      findFirstCaretBlockId([
        block("node:divider", NodeType.DIVIDER),
        block("node:text", NodeType.SIMPLE_TEXT, "First line")
      ])
    ).toBe("node:text");
  });

  it("skips every block without a text input before a heading", () => {
    expect(
      findFirstCaretBlockId([
        block("node:double-divider", NodeType.DOUBLE_DIVIDER),
        block("node:toc", NodeType.TOC),
        block("node:heading", NodeType.HEADING1),
        block("node:text", NodeType.SIMPLE_TEXT, "After")
      ])
    ).toBe("node:heading");
  });

  it("is the first block when it takes a caret", () => {
    expect(
      findFirstCaretBlockId([
        block("node:text", NodeType.SIMPLE_TEXT, "Start"),
        block("node:divider", NodeType.DIVIDER)
      ])
    ).toBe("node:text");
  });

  it("is a list item or callout as the block content renders a text input for them", () => {
    expect(
      findFirstCaretBlockId([
        block("node:divider", NodeType.DIVIDER),
        block("node:list", NodeType.CHECKLIST, { text: "Item" })
      ])
    ).toBe("node:list");
    expect(
      findFirstCaretBlockId([
        block("node:divider", NodeType.DIVIDER),
        block("node:callout", NodeType.CALLOUT, { text: "Note" })
      ])
    ).toBe("node:callout");
  });

  it("skips a text block whose content cannot render a text input", () => {
    expect(
      findFirstCaretBlockId([
        block("node:broken", NodeType.SIMPLE_TEXT, { text: "Not a string" }),
        block("node:text", NodeType.SIMPLE_TEXT, "Shown")
      ])
    ).toBe("node:text");
  });

  it("is none in a note of dividers only or with no blocks", () => {
    expect(
      findFirstCaretBlockId([
        block("node:divider", NodeType.DIVIDER),
        block("node:double-divider", NodeType.DOUBLE_DIVIDER)
      ])
    ).toBeUndefined();
    expect(findFirstCaretBlockId([])).toBeUndefined();
    expect(findFirstCaretBlockId(undefined)).toBeUndefined();
  });
});

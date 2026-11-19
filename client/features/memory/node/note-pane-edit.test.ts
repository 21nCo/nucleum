import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import type { INode } from "@nucleum/features/memory/node/node.type";
import view from "@21n/ui/environment/view.store";
import { withResourceActionKeys } from "@nucleum/features/records/resource-action-keys";
import { findFirstCaretBlockId } from "@nucleum/features/memory/markdown/note-editor-focus";

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

function editItemIn(node: INode, isOpenedIncomplete: boolean) {
  return withResourceActionKeys(
    resolveNodeContextMenu(node, ResourceAccessPoint.SELF, {
      accessMode: AccessMode.PAGE,
      paneId: isOpenedIncomplete ? "incomplete-pane" : "complete-pane",
      isOpenedIncomplete
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
    expect(editItemIn(store.get(), false)?.hotKey).toBe("e");
    expect(editItemIn(store.get(), true)).toBeUndefined();

    await load();
    expect(editItemIn(store.get(), false)?.hotKey).toBe("e");
    expect(editItemIn(store.get(), true)).toBeUndefined();
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

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import {
  datafn,
  destroyNucleumDatafn,
  initializeNucleumDatafn
} from "@nucleum/datafn/datafn.store";
import { Product } from "@nucleum/client/config/product.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { repairMarkdownBlockParents } from "@nucleum/features/memory/node/markdown-block-parents";

describe("repairMarkdownBlockParents", () => {
  afterEach(async () => {
    await destroyNucleumDatafn();
  });

  async function boot() {
    appStore.set({
      ...get(appStore),
      product: Product.MEMOTRON
    });
    await initializeNucleumDatafn({
      product: Product.MEMOTRON,
      account: {
        dataMode: UserDataMode.LOCAL,
        userId: "markdown-block-parents-test"
      },
      dapId: "markdown-block-parents-dap",
      env: `test-${crypto.randomUUID()}`
    });
  }

  async function readNode(id: string) {
    const result = await datafn.node.query({
      select: ["id", "mdParent", "parent", "parentPath", "creationContext"],
      filters: { id }
    });
    return result.data?.[0];
  }

  it("links orphaned blocks in a note's block tree and leaves other nodes alone", async () => {
    await boot();
    const noteId = "node:note-alpha";
    const headingId = "node:heading-alpha";
    const orphanId = "node:orphan-block";
    const nestedOrphanId = "node:nested-orphan-block";
    const linkedId = "node:linked-block";
    const embeddedFileId = "node:embedded-file";
    const clipId = "node:clip-alpha";
    const supplementId = "node:supplement-alpha";
    await datafn.node.mutate([
      {
        operation: "insert",
        id: noteId,
        record: {
          id: noteId,
          label: "Note",
          body: "",
          contentType: NodeType.NODULAR_MARKDOWN,
          mdChildOrder: [orphanId, headingId]
        }
      },
      {
        operation: "insert",
        id: orphanId,
        record: {
          id: orphanId,
          label: "",
          body: "orphan",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: noteId
        }
      },
      {
        operation: "insert",
        id: headingId,
        record: {
          id: headingId,
          label: "Heading",
          body: "",
          contentType: NodeType.HEADING1,
          creationContext: noteId,
          mdParent: [noteId],
          parent: noteId,
          parentPath: noteId,
          mdChildOrder: [nestedOrphanId, linkedId]
        }
      },
      {
        operation: "insert",
        id: nestedOrphanId,
        record: {
          id: nestedOrphanId,
          label: "",
          body: "nested orphan",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: noteId
        }
      },
      {
        operation: "insert",
        id: linkedId,
        record: {
          id: linkedId,
          label: "",
          body: "linked",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: noteId,
          mdParent: [noteId, headingId],
          parent: headingId,
          parentPath: `${noteId}-${headingId}`
        }
      },
      {
        operation: "insert",
        id: embeddedFileId,
        record: {
          id: embeddedFileId,
          label: "Embedded file",
          body: {},
          contentType: NodeType.FILE,
          creationContext: noteId
        }
      },
      {
        operation: "insert",
        id: clipId,
        record: { id: clipId, label: "Clip", body: "", contentType: NodeType.SIMPLE_TEXT }
      },
      {
        operation: "insert",
        id: supplementId,
        record: {
          id: supplementId,
          label: "Supplement",
          body: "",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: clipId
        }
      }
    ]);

    expect(await repairMarkdownBlockParents()).toBe(2);

    for (const id of [orphanId, nestedOrphanId]) {
      expect(await readNode(id)).toMatchObject({
        mdParent: [noteId],
        parent: noteId,
        parentPath: noteId
      });
    }
    expect(await readNode(linkedId)).toMatchObject({
      mdParent: [noteId, headingId],
      parent: headingId
    });
    for (const id of [embeddedFileId, supplementId]) {
      const record = await readNode(id);
      expect(record?.parent ?? null).toBeNull();
      expect(record?.mdParent ?? []).toEqual([]);
    }

    expect(await repairMarkdownBlockParents()).toBe(0);
  });
});

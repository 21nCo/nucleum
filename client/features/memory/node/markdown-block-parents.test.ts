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

  it("links orphaned markdown blocks to their note and leaves other nodes alone", async () => {
    await boot();
    const noteId = "node:note-alpha";
    const orphanId = "node:orphan-block";
    const linkedId = "node:linked-block";
    const clipId = "node:clip-alpha";
    const supplementId = "node:supplement-alpha";
    await datafn.node.mutate([
      {
        operation: "insert",
        id: noteId,
        record: { id: noteId, label: "Note", body: "", contentType: NodeType.NODULAR_MARKDOWN }
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
        id: linkedId,
        record: {
          id: linkedId,
          label: "",
          body: "linked",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: noteId,
          mdParent: [noteId, "node:heading-alpha"],
          parent: "node:heading-alpha",
          parentPath: `${noteId}-node:heading-alpha`
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

    expect(await repairMarkdownBlockParents()).toBe(1);

    expect(await readNode(orphanId)).toMatchObject({
      mdParent: [noteId],
      parent: noteId,
      parentPath: noteId
    });
    expect(await readNode(linkedId)).toMatchObject({
      mdParent: [noteId, "node:heading-alpha"],
      parent: "node:heading-alpha"
    });
    const supplement = await readNode(supplementId);
    expect(supplement?.parent ?? null).toBeNull();
    expect(supplement?.mdParent ?? []).toEqual([]);

    expect(await repairMarkdownBlockParents()).toBe(0);
  });
});

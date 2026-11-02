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
import {
  onNodeArchive,
  onNodeUnarchive
} from "@nucleum/features/memory/node/node.store";

describe("note archive propagation", () => {
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
        userId: "node-archive-test"
      },
      dapId: "node-archive-dap",
      env: `test-${crypto.randomUUID()}`
    });
  }

  async function readBlock(id: string) {
    const result = await datafn.node.query({
      select: ["id", "isAncestorInactive"],
      filters: { id },
      metadata: { includeAncestorInactive: true }
    });
    return result.data?.[0];
  }

  it("deactivates a note's blocks on archive, hides them from default reads, and reactivates them on unarchive", async () => {
    await boot();
    const noteId = "node:note-archive";
    const blockId = "node:block-archive";
    await datafn.node.mutate([
      {
        operation: "insert",
        id: noteId,
        record: {
          id: noteId,
          label: "Note",
          body: "",
          contentType: NodeType.NODULAR_MARKDOWN,
          mdChildOrder: [blockId]
        }
      },
      {
        operation: "insert",
        id: blockId,
        record: {
          id: blockId,
          label: "",
          body: "block",
          contentType: NodeType.SIMPLE_TEXT,
          creationContext: noteId,
          mdParent: [noteId],
          parent: noteId,
          parentPath: noteId
        }
      }
    ]);

    await datafn.node.mutate({ operation: "archive", id: noteId });
    await onNodeArchive([noteId]);
    expect(await readBlock(blockId)).toMatchObject({ isAncestorInactive: true });
    const defaultRead = await datafn.node.query({
      select: ["id"],
      filters: { id: { $in: [blockId] } },
      metadata: { includeTrashed: true, includeArchived: true }
    });
    expect(defaultRead.data ?? []).toHaveLength(0);

    await datafn.node.mutate({ operation: "unarchive", id: noteId });
    await onNodeUnarchive([noteId]);
    expect(await readBlock(blockId)).toMatchObject({ isAncestorInactive: false });
  });
});

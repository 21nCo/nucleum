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
import { onNodeArchive } from "@nucleum/features/memory/node/node.store";
import { resolveSpaceHeadingQueries } from "@nucleum/features/spaces/space.utils";

describe("space heading queries", () => {
  afterEach(async () => {
    await destroyNucleumDatafn();
  });

  it("reads the headings of an archived page", async () => {
    appStore.set({ ...get(appStore), product: Product.MEMOTRON });
    await initializeNucleumDatafn({
      product: Product.MEMOTRON,
      account: {
        dataMode: UserDataMode.LOCAL,
        userId: "space-heading-test"
      },
      dapId: "space-heading-dap",
      env: `test-${crypto.randomUUID()}`
    });
    const noteId = "node:space-heading-note";
    const headingId = "node:space-heading-one";
    await datafn.node.mutate([
      {
        operation: "insert",
        id: noteId,
        record: {
          id: noteId,
          label: "Note",
          body: "",
          contentType: NodeType.NODULAR_MARKDOWN,
          mdChildOrder: [headingId]
        }
      },
      {
        operation: "insert",
        id: headingId,
        record: {
          id: headingId,
          label: "Heading one",
          body: "",
          contentType: NodeType.HEADING1,
          creationContext: noteId,
          mdParent: [noteId],
          parent: noteId,
          parentPath: noteId
        }
      }
    ]);
    await datafn.node.mutate({ operation: "archive", id: noteId });
    await onNodeArchive([noteId]);

    const queries = resolveSpaceHeadingQueries(noteId);
    const page = await datafn.node.query(queries.page);
    const blocks = await datafn.node.query(queries.blocks);

    expect(page.data).toEqual([
      expect.objectContaining({ id: noteId, mdChildOrder: [headingId] })
    ]);
    expect(blocks.data).toEqual([
      expect.objectContaining({
        id: headingId,
        contentType: NodeType.HEADING1
      })
    ]);
  });
});

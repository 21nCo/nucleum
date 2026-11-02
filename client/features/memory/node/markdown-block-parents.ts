import { datafn } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

const repairBatchSize = 200;

/**
 * Restores the parent chain of markdown blocks that were saved without one.
 *
 * Blocks captured before top-level blocks defaulted to their note have a
 * `creationContext` but no `mdParent`, `parent` or `parentPath`, so trash,
 * archive and inactive propagation and parent-aware search cannot find them.
 * Only blocks whose creation context is a nodular markdown note are repaired;
 * clipper supplements also use `creationContext` and are left untouched.
 * Writes go through DataFn so they sync, and the repair is idempotent.
 *
 * @returns The number of blocks repaired.
 */
export async function repairMarkdownBlockParents(): Promise<number> {
  try {
    const orphanResult = await datafn.node.query({
      select: ["id", "creationContext"],
      filters: {
        creationContext: { $is_not_empty: true },
        mdParent: { $is_empty: true }
      },
      metadata: {
        includeTrashed: true,
        includeArchived: true
      }
    });
    const orphans = (orphanResult.data ?? []).filter(
      (record): record is { id: IRecordId; creationContext: IRecordId } =>
        typeof record?.id === "string" &&
        typeof record?.creationContext === "string"
    );
    if (orphans.length === 0) return 0;

    const contextIds = [...new Set(orphans.map((record) => record.creationContext))];
    const noteIds = new Set<string>();
    for (let index = 0; index < contextIds.length; index += repairBatchSize) {
      const notesResult = await datafn.node.query({
        select: ["id"],
        filters: {
          id: { $in: contextIds.slice(index, index + repairBatchSize) },
          contentType: NodeType.NODULAR_MARKDOWN
        },
        metadata: {
          includeTrashed: true,
          includeArchived: true
        }
      });
      for (const note of notesResult.data ?? []) {
        if (typeof note?.id === "string") noteIds.add(note.id);
      }
    }

    const blocks = orphans.filter((record) => noteIds.has(record.creationContext));
    for (let index = 0; index < blocks.length; index += repairBatchSize) {
      await datafn.node.mutate(
        blocks.slice(index, index + repairBatchSize).map((block) => ({
          operation: "merge",
          id: block.id,
          record: {
            id: block.id,
            mdParent: [block.creationContext],
            parent: block.creationContext,
            parentPath: block.creationContext
          }
        }))
      );
    }
    if (blocks.length > 0) {
      logger.info({ at: "repairMarkdownBlockParents", repaired: blocks.length });
    }
    return blocks.length;
  } catch (error) {
    logger.error({ at: "repairMarkdownBlockParents", error });
    return 0;
  }
}

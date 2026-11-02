import { datafn } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

const repairBatchSize = 200;

const repairQueryMetadata = {
  includeTrashed: true,
  includeArchived: true,
  includeAncestorInactive: true
};

type BlockRecord = {
  id: IRecordId;
  creationContext?: IRecordId;
  mdChildOrder?: unknown;
};

function readChildIds(mdChildOrder: unknown): IRecordId[] {
  if (!Array.isArray(mdChildOrder)) return [];
  return mdChildOrder
    .map((child) => {
      if (typeof child === "string") return child;
      if (child && typeof child === "object" && "id" in child) {
        return (child as { id?: unknown }).id;
      }
      return undefined;
    })
    .filter((child): child is IRecordId => typeof child === "string");
}

async function queryInBatches(
  ids: IRecordId[],
  buildFilters: (batch: IRecordId[]) => Record<string, unknown>,
  select: string[]
): Promise<BlockRecord[]> {
  const records: BlockRecord[] = [];
  for (let index = 0; index < ids.length; index += repairBatchSize) {
    const result = await datafn.node.query({
      select,
      filters: buildFilters(ids.slice(index, index + repairBatchSize)),
      metadata: repairQueryMetadata
    });
    for (const record of result.data ?? []) {
      if (typeof record?.id === "string") records.push(record as BlockRecord);
    }
  }
  return records;
}

/**
 * Collects the ids reachable from a note through `mdChildOrder`, following
 * each block's own `mdChildOrder` for headings and nested blocks.
 */
function collectNoteBlockIds(
  note: BlockRecord,
  blocksById: Map<IRecordId, BlockRecord>
): Set<IRecordId> {
  const reachable = new Set<IRecordId>();
  const queue = readChildIds(note.mdChildOrder);
  while (queue.length > 0) {
    const id = queue.shift() as IRecordId;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const block = blocksById.get(id);
    if (block) queue.push(...readChildIds(block.mdChildOrder));
  }
  return reachable;
}

/**
 * Restores the parent chain of markdown blocks that were saved without one.
 *
 * Blocks captured before top-level blocks defaulted to their note have a
 * `creationContext` but no `mdParent`, `parent` or `parentPath`, so trash,
 * archive and inactive propagation and parent-aware search cannot find them.
 * Only nodes that belong to a nodular markdown note's block tree (reachable
 * through `mdChildOrder`) are repaired. Media, links and files embedded in a
 * note and clipper supplements also carry `creationContext` but are not part
 * of the block tree, so they are left untouched. Writes go through DataFn so
 * they sync, and the repair is idempotent.
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
      metadata: repairQueryMetadata
    });
    const orphans = (orphanResult.data ?? []).filter(
      (record): record is { id: IRecordId; creationContext: IRecordId } =>
        typeof record?.id === "string" &&
        typeof record?.creationContext === "string"
    );
    if (orphans.length === 0) return 0;

    const contextIds = [
      ...new Set(orphans.map((record) => record.creationContext))
    ];
    const notes = await queryInBatches(
      contextIds,
      (batch) => ({
        id: { $in: batch },
        contentType: NodeType.NODULAR_MARKDOWN
      }),
      ["id", "mdChildOrder"]
    );
    if (notes.length === 0) return 0;

    const noteBlocks = await queryInBatches(
      notes.map((note) => note.id),
      (batch) => ({ creationContext: { $in: batch } }),
      ["id", "creationContext", "mdChildOrder"]
    );
    const blocksById = new Map(noteBlocks.map((block) => [block.id, block]));
    const treeByNote = new Map(
      notes.map((note) => [note.id, collectNoteBlockIds(note, blocksById)])
    );

    const blocks = orphans.filter((record) =>
      treeByNote.get(record.creationContext)?.has(record.id)
    );
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
      logger.info({
        at: "repairMarkdownBlockParents",
        repaired: blocks.length
      });
    }
    return blocks.length;
  } catch (error) {
    logger.error({ at: "repairMarkdownBlockParents", error });
    return 0;
  }
}

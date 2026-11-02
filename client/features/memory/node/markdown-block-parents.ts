import { datafn } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { headingNodeTypes } from "@nucleum/features/memory/node/node.type";
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
  contentType?: string;
  mdChildOrder?: unknown;
};

function isHeadingBlock(block: BlockRecord | undefined) {
  return Boolean(
    block?.contentType &&
      (headingNodeTypes as readonly string[]).includes(block.contentType)
  );
}

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
 * Walks a note's block tree through `mdChildOrder` (following each block's
 * own `mdChildOrder` for headings and nested blocks) and returns, for every
 * reachable id, the heading blocks above it in the tree.
 */
function collectNoteBlockHeadings(
  note: BlockRecord,
  blocksById: Map<IRecordId, BlockRecord>
): Map<IRecordId, IRecordId[]> {
  const headingsById = new Map<IRecordId, IRecordId[]>();
  const queue: { id: IRecordId; headings: IRecordId[] }[] = readChildIds(
    note.mdChildOrder
  ).map((id) => ({ id, headings: [] }));
  for (let index = 0; index < queue.length; index += 1) {
    const { id, headings } = queue[index];
    if (headingsById.has(id)) continue;
    headingsById.set(id, headings);
    const block = blocksById.get(id);
    if (!block) continue;
    const childHeadings = isHeadingBlock(block) ? [...headings, id] : headings;
    for (const childId of readChildIds(block.mdChildOrder)) {
      queue.push({ id: childId, headings: childHeadings });
    }
  }
  return headingsById;
}

/**
 * Restores the parent chain of markdown blocks that were saved without one.
 *
 * Blocks captured before top-level blocks defaulted to their note have a
 * `creationContext` but no `mdParent`, `parent` or `parentPath`, so trash,
 * archive and inactive propagation and parent-aware search cannot find them.
 * Only nodes that belong to a nodular markdown note's block tree (reachable
 * through `mdChildOrder`) are repaired. Like the editor, non-heading blocks get
 * the note as parent and headings get the note followed by the headings above
 * them. Media, links and files embedded in a
 * note and clipper supplements also carry `creationContext` but are not part
 * of the block tree, so they are left untouched. Writes go through DataFn so
 * they sync and are marked as system changes (like structural block updates),
 * and the repair is idempotent.
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
      ["id", "creationContext", "contentType", "mdChildOrder"]
    );
    const blocksById = new Map(noteBlocks.map((block) => [block.id, block]));
    const treeByNote = new Map(
      notes.map((note) => [note.id, collectNoteBlockHeadings(note, blocksById)])
    );

    const blocks = orphans.flatMap((record) => {
      const headings = treeByNote.get(record.creationContext)?.get(record.id);
      if (!headings) return [];
      const mdParent = isHeadingBlock(blocksById.get(record.id))
        ? [record.creationContext, ...headings]
        : [record.creationContext];
      return [{ id: record.id, mdParent }];
    });
    for (let index = 0; index < blocks.length; index += repairBatchSize) {
      await datafn.node.mutate(
        blocks.slice(index, index + repairBatchSize).map((block) => ({
          operation: "merge",
          id: block.id,
          record: {
            id: block.id,
            mdParent: block.mdParent,
            parent: block.mdParent[block.mdParent.length - 1],
            parentPath: block.mdParent.join("-")
          },
          system: true
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

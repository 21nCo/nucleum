import { datafn } from "@nucleum/datafn/datafn.store";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/**
 * What the stored data says about a markdown note's blocks, read fresh rather
 * than from the copy a page already holds (which may come from a narrow
 * select, or from a local store that hasn't finished downloading).
 */
export type StoredNoteBlocks = {
  /** The note's stored block order, when it has one. */
  mdChildOrder: IRecordId[];
  /** Whether any block was created inside the note. */
  hasBlocks: boolean;
};

const readOptions = {
  includeTrashed: true,
  includeArchived: true,
  includeAncestorInactive: true
};

/** Reads a note's stored block order and whether any of its blocks exist. */
export async function readStoredNoteBlocks(
  noteId: IRecordId
): Promise<StoredNoteBlocks> {
  const id = noteId.toString();
  const [noteResult, blockResult] = await Promise.all([
    datafn.node.query({
      select: ["id", "mdChildOrder"],
      filters: { id: { eq: id } },
      limit: 1,
      metadata: readOptions
    }),
    datafn.node.query({
      select: ["id"],
      filters: { creationContext: { eq: id } },
      limit: 1,
      metadata: readOptions
    })
  ]);
  const order = noteResult.data?.[0]?.mdChildOrder;
  return {
    mdChildOrder: Array.isArray(order)
      ? (order.filter((value) => typeof value === "string") as IRecordId[])
      : [],
    hasBlocks: (blockResult.data?.length ?? 0) > 0
  };
}

/**
 * Whether a note may get a starter block: only when the stored note has no
 * block order and no block was ever created inside it. Anything else means
 * its content exists but isn't loaded here yet, and writing a starter block
 * would replace it.
 */
export function canCreateFirstBlock(stored: StoredNoteBlocks) {
  return stored.mdChildOrder.length === 0 && !stored.hasBlocks;
}

/**
 * How a markdown note whose page copy has no blocks should start: with a
 * starter block when storage holds none, by loading the stored blocks when
 * storage has a block order, or held (the editor stays unmounted, since an
 * empty editor seeds a block of its own) when blocks exist without an order
 * or storage couldn't be read.
 */
export type NoteContentStart =
  | { kind: "create" }
  | { kind: "load"; mdChildOrder: IRecordId[] }
  | { kind: "hold" };

/** Chooses how a note with no blocks on its page should start; see {@link NoteContentStart}. */
export function resolveNoteContentStart(
  stored: StoredNoteBlocks | undefined
): NoteContentStart {
  if (!stored) return { kind: "hold" };
  if (canCreateFirstBlock(stored)) return { kind: "create" };
  if (stored.mdChildOrder.length > 0) {
    return { kind: "load", mdChildOrder: stored.mdChildOrder };
  }
  return { kind: "hold" };
}

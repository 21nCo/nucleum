import { toSvelteStore } from "@datafn/svelte";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import { datafn } from "@nucleum/datafn/datafn.store";

/** A space pinned to the app menu, as shown in the menu and on the phone home. */
export type PinnedSpace = { id: string; label?: string; avatar?: IAvatar };

/**
 * Key of the pinned space ids. Derive the store from this string, not from the
 * id array, so it is rebuilt only when the pinned ids actually change.
 */
export function toPinnedSpacesKey(ids: string[]): string {
  return ids.join(",");
}

/**
 * Live records of the pinned spaces named by a key from `toPinnedSpacesKey`,
 * in no particular order.
 */
export function createPinnedSpacesStore(key: string) {
  return toSvelteStore<PinnedSpace[]>(
    datafn.space.signal({
      filters: { id: { $in: key ? key.split(",") : [] } },
      select: ["id", "label", "avatar"]
    }),
    { initialData: [] }
  );
}

/**
 * Orders loaded space records by the pinned order, dropping pins whose space
 * is missing.
 */
export function orderPinnedSpaces(
  ids: string[],
  spaces: PinnedSpace[] | undefined
): PinnedSpace[] {
  const byId = new Map((spaces ?? []).map((space) => [space.id, space]));
  return ids
    .map((id) => byId.get(id))
    .filter((space): space is PinnedSpace => Boolean(space));
}

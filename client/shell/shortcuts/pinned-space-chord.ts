import { datafn } from "@nucleum/datafn/datafn.store";
import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
import {
  orderPinnedSpaces,
  type PinnedSpace
} from "@nucleum/shell/navigation/pinned-spaces";

/**
 * Reads the pinned space at a zero-based position in the app menu's shown
 * order, which skips pins whose space is missing, or undefined when there is
 * none. Reads the stored menu and spaces once, so it works while the app menu
 * is hidden or still loading.
 */
export async function resolvePinnedSpaceAt(
  index: number
): Promise<PinnedSpace | undefined> {
  const ids = appMenuStore.pinnedSpaces(await appMenuStore.read());
  if (index >= ids.length) return undefined;
  const result = await datafn.space.query({
    filters: { id: { $in: ids } },
    select: ["id"]
  });
  return orderPinnedSpaces(ids, result.data as PinnedSpace[])[index];
}

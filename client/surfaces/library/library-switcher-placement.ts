import { derived, writable } from "svelte/store";
import { Product } from "@nucleum/client/config/product.type";

/** Most library resource types the top bar switcher lists. */
export const LIBRARY_TOP_BAR_SWITCHER_LIMIT = 3;

/** Layout facts that decide whether the top bar can show the switcher. */
export type LibrarySwitcherLayout = {
  /** Whether a top bar hosts the context zone. */
  isContextZoneHosted: boolean;
  isConstrainedWidth: boolean;
};

/**
 * Whether the library resource switcher sits in the top bar instead of the
 * left panel. It needs a top bar hosting the context zone at full width, and
 * a product other than Nucleum listing at most LIBRARY_TOP_BAR_SWITCHER_LIMIT
 * resource types. The top bar and the left panel use the same answer, so the
 * switcher shows in exactly one place.
 */
export function isLibrarySwitcherInTopBar(
  product: Product | undefined,
  resourceCount: number,
  layout: LibrarySwitcherLayout
) {
  return (
    layout.isContextZoneHosted &&
    !layout.isConstrainedWidth &&
    product !== Product.NUCLEUM &&
    resourceCount > 0 &&
    resourceCount <= LIBRARY_TOP_BAR_SWITCHER_LIMIT
  );
}

const hostedTabsCount = writable(0);

/**
 * Library resource tabs the library page shows in the top bar. The left panel
 * hides its own switcher only while these tabs are hosted, so a library page
 * rendered without them, such as the standalone portrait route, keeps it.
 */
export const libraryTopBarTabs = {
  /** Whether a library page currently shows its resource tabs in the top bar. */
  isHosted: derived(hostedTabsCount, (count) => count > 0),
  /** Marks the tabs as shown in the top bar; returns its release function. */
  host() {
    hostedTabsCount.update((count) => count + 1);
    return () => hostedTabsCount.update((count) => Math.max(0, count - 1));
  }
};

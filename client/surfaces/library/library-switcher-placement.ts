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

import { Product } from "@nucleum/client/config/product.type";

/** Most library resource types the top bar switcher lists. */
export const LIBRARY_TOP_BAR_SWITCHER_LIMIT = 3;

/**
 * Whether the library resource switcher sits in the top bar instead of the
 * left panel. Nucleum, and any product listing more than
 * LIBRARY_TOP_BAR_SWITCHER_LIMIT resource types, keeps it in the left panel.
 */
export function isLibrarySwitcherInTopBar(
  product: Product | undefined,
  resourceCount: number
) {
  return (
    product !== Product.NUCLEUM &&
    resourceCount > 0 &&
    resourceCount <= LIBRARY_TOP_BAR_SWITCHER_LIMIT
  );
}

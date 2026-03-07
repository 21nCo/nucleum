/**
 * Memotron product config for E2E. Re-exports from central product-nav.config
 * so menu/labels are defined in one place (client/products/product-nav.config.ts).
 */
import { getE2EProductConfig } from "@21n/products/product-nav.config";
import { Product } from "@21n/products/product.type";

export const memotronProductConfig = getE2EProductConfig(Product.MEMOTRON);

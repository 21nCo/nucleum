/**
 * Nucleus product config for E2E. Re-exports from central product-nav.config
 * so menu/labels are defined in one place (client/products/product-nav.config.ts).
 */
import {
  getE2EProductConfig,
  type NucleusAppMenuLabel
} from "@21n/products/product-nav.config";
import { Product } from "@21n/products/product.type";

export const nucleusProductConfig = getE2EProductConfig(Product.NUCLEUS);
export type { NucleusAppMenuLabel };

import { NextProduct, NextOverviewPanel } from "@21n/next/product.type";


enum OverviewPanelBase {
  FOCUS = "focus",
  MEMORY = "memory",
  GRAPH = "graph",
  MAP = "map"
}

export const OverviewPanel = { ...OverviewPanelBase, ...NextOverviewPanel } as const;
export type OverviewPanel = OverviewPanelBase | NextOverviewPanel;

enum ProductBase {
  NUCLEUS = "nucleus",
  POINTRON = "pointron",
  MEMOTRON = "memotron",
}

export const Product = { ...ProductBase, ...NextProduct } as const;
export type Product = ProductBase | NextProduct;

export enum Extension {
  MEMOTRON_CLIPPER = "memotron-clipper",
  MEMOTRON_SHARE = "memotron-share"
}

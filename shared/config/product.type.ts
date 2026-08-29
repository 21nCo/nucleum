import { NextOverviewPanel, NextProduct } from "@21n/next/product.type";

enum ProductBase {
  NUCLEUM = "nucleum",
  POINTRON = "pointron",
  MEMOTRON = "memotron"
}

enum OverviewPanelBase {
  /**
   * @deprecated - use {@link OverviewPanel.DASHBOARD} instead
   *
   * Dashboard will host all dashboards from sub apps and their respective custom dashboards created by users.
   */
  FOCUS = "focus",
  /**
   * @deprecated - use {@link OverviewPanel.GRAPH} and {@link OverviewPanel.MAP} instead
   */
  MEMORY = "memory",
  /**
   * current version: regular central graph
   * v2: Central graph + another view: Horizontal infinite canvas with clusters
   */
  GRAPH = "graph",
  MAP = "map",
  DASHBOARD = "dashboard"
}

export const Product = { ...ProductBase, ...NextProduct } as const;
export type Product = ProductBase | NextProduct;

export const OverviewPanel = {
  ...OverviewPanelBase,
  ...NextOverviewPanel
} as const;
export type OverviewPanel = OverviewPanelBase | NextOverviewPanel;

export enum Extension {
  MEMOTRON_CLIPPER = "memotron-clipper",
  MEMOTRON_SHARE = "memotron-share"
}

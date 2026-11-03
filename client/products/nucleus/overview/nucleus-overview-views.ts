import type { ISelectItem } from "@21n/ui/elements/select/select.type";
import { OverviewPanel, Product } from "@nucleum/client/config/product.type";
import { resolveProductConfig } from "@nucleum/products/product.config";
import type { PageViewSegment } from "@nucleum/shared-state/commands/page-view-actions";

/** Overview panels offered by the Nucleum overview switcher. */
export function resolveNucleusOverviewItems(): ISelectItem[] {
  return [
    ...(resolveProductConfig(Product.NUCLEUM).overviewPanelSwitcherItems ?? []),
    {
      label: "Map",
      value: OverviewPanel.MAP,
      icon: "ph:map-pin-light"
    }
  ];
}

/** Overview panels as `overview/<panel>` page view segments. */
export function resolveNucleusOverviewViewSegments(): PageViewSegment[][] {
  return resolveNucleusOverviewItems().map((item) => [
    { slug: String(item.value), label: item.label ?? String(item.value) }
  ]);
}

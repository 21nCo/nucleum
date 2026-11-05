import { MemotronOverviewPanel } from "@nucleum/products/memotron/overview/overview.type";
import type { PageViewSegment } from "@nucleum/shared-state/commands/page-view-actions";

/** Memotron overview panels with their switcher labels and icons. */
export const memotronOverviewItems = [
  {
    label: "Graph",
    value: MemotronOverviewPanel.GRAPH,
    icon: "graph"
  },
  {
    label: "Map",
    value: MemotronOverviewPanel.MAP,
    icon: "ph:map-pin-light"
  }
];

/** Memotron overview panels as `overview/<panel>` page view segments. */
export function resolveMemotronOverviewViewSegments(): PageViewSegment[][] {
  return memotronOverviewItems.map((item) => [
    { slug: item.value, label: item.label }
  ]);
}

/** Reads a Memotron overview panel from its path segment. */
export function parseMemotronOverviewPanel(
  slug: string | undefined
): MemotronOverviewPanel | undefined {
  return memotronOverviewItems.find((item) => item.value === slug)?.value;
}

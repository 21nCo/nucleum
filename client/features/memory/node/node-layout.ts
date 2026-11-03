import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { ResourcePanelType } from "@nucleum/shared-state/resources/resource-panel.type";
import { resolveMinWidth } from "@nucleum/shell/layout.utils";
import { headingNodeTypes } from "@nucleum/features/memory/node/node.type";

/**
 * Width in rem that a node page needs to show its content beside an open side
 * panel: the 50rem content column, the 28rem panel, and their gap and padding.
 */
export const NODE_CONTENT_WITH_PANEL_REM = 81;

/** Whether the node shows a side panel next to its content. */
export function isNodeSidePanelOpen(
  panel: string | undefined,
  isInFocusMode = false
) {
  return (
    !isInFocusMode &&
    !!panel &&
    panel !== ResourcePanelType.DEFAULT &&
    panel !== ResourcePanelType.CONTENT &&
    panel !== ResourcePanelType.NONE
  );
}

/**
 * Narrowest container width, in pixels, at which a node page keeps its wide
 * layout. Markdown and heading nodes lay out content between a gutter and a
 * table of contents; an open side panel needs room for the content column
 * and the panel. Below this width the node uses its constrained layout.
 */
export function resolveNodeMinWidth(
  node: {
    contentType?: NodeType | string;
    panel?: string;
    isInFocusMode?: boolean;
  },
  remPx = 16
) {
  const isMarkdown =
    node.contentType === NodeType.NODULAR_MARKDOWN ||
    headingNodeTypes.includes(node.contentType as NodeType);
  const columns = resolveMinWidth(isMarkdown ? 3 : 2);
  if (!isNodeSidePanelOpen(node.panel, node.isInFocusMode)) return columns;
  return Math.max(columns, NODE_CONTENT_WITH_PANEL_REM * remPx);
}

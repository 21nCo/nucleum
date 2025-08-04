import {
  register,
  DragCanvas,
  ZoomCanvas,
  DragElement,
  ClickSelect,
  HoverActivate,
  Circle,
  Line,
  ForceLayout,
  RadialLayout,
  DendrogramLayout,
  D3ForceLayout
} from "@antv/g6";

let isG6Registered = false;

/**
 * Ensures G6 behaviors, nodes, edges, and layouts are registered only once.
 * This prevents duplicate registrations that can cause warnings or unexpected behavior.
 */
export function ensureG6Registered(): void {
  if (isG6Registered) return;

  // Register behaviors
  register("behavior", "drag-canvas", DragCanvas);
  register("behavior", "zoom-canvas", ZoomCanvas);
  register("behavior", "drag-element", DragElement);
  register("behavior", "click-select", ClickSelect);
  register("behavior", "hover-activate", HoverActivate);

  // Register nodes
  register("node", "circle", Circle);

  // Register edges
  register("edge", "line", Line);

  // Register layouts
  register("layout", "force", ForceLayout);
  register("layout", "radial", RadialLayout);
  register("layout", "dendrogram", DendrogramLayout);
  register("layout", "d3-force", D3ForceLayout);

  isG6Registered = true;
}
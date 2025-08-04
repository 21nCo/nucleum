import {
  register,
  ExtensionCategory,
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
  D3ForceLayout,
  CollapseExpand,
  Hexagon
} from "@antv/g6";

// Global flag to ensure registration only happens once across the entire application
let isG6Registered = false;

// Store the registration promise to handle concurrent calls
let registrationPromise: Promise<void> | null = null;

/**
 * Ensures G6 behaviors, nodes, edges, layouts, and themes are registered only once.
 * This prevents duplicate registrations that can cause warnings or unexpected behavior.
 * Uses a global flag and promise to handle concurrent registration attempts.
 */
export function ensureG6Registered(): Promise<void> {
  // If already registered, return immediately
  if (isG6Registered) {
    return Promise.resolve();
  }

  // If registration is in progress, return the existing promise
  if (registrationPromise) {
    return registrationPromise;
  }

  // Start registration process
  registrationPromise = performRegistration();
  return registrationPromise;
}

async function performRegistration(): Promise<void> {
  // Double-check after acquiring the promise
  if (isG6Registered) {
    return;
  }

  try {
    // Register behaviors using ExtensionCategory (G6 v5 syntax)
    register(ExtensionCategory.BEHAVIOR, "drag-canvas", DragCanvas);
    register(ExtensionCategory.BEHAVIOR, "zoom-canvas", ZoomCanvas);
    register(ExtensionCategory.BEHAVIOR, "drag-element", DragElement);
    register(ExtensionCategory.BEHAVIOR, "click-select", ClickSelect);
    register(ExtensionCategory.BEHAVIOR, "hover-activate", HoverActivate);
    register(ExtensionCategory.BEHAVIOR, "collapse-expand", CollapseExpand);

    // Register nodes
    register(ExtensionCategory.NODE, "circle", Circle);
    register(ExtensionCategory.NODE, "hexagon", Hexagon);

    // Register edges
    register(ExtensionCategory.EDGE, "line", Line);

    // Register layouts
    register(ExtensionCategory.LAYOUT, "force", ForceLayout);
    register(ExtensionCategory.LAYOUT, "radial", RadialLayout);
    register(ExtensionCategory.LAYOUT, "dendrogram", DendrogramLayout);
    register(ExtensionCategory.LAYOUT, "d3-force", D3ForceLayout);

    isG6Registered = true;
  } catch (error) {
    console.warn(
      "Some G6 extensions failed to register with ExtensionCategory:",
      error
    );
    // Fallback to legacy registration syntax if ExtensionCategory is not available
    try {
      register("behavior", "drag-canvas", DragCanvas);
      register("behavior", "zoom-canvas", ZoomCanvas);
      register("behavior", "drag-element", DragElement);
      register("behavior", "click-select", ClickSelect);
      register("behavior", "hover-activate", HoverActivate);
      register("behavior", "collapse-expand", CollapseExpand);
      register("node", "circle", Circle);
      register("node", "hexagon", Hexagon);
      register("edge", "line", Line);
      register("layout", "force", ForceLayout);
      register("layout", "radial", RadialLayout);
      register("layout", "dendrogram", DendrogramLayout);
      register("layout", "d3-force", D3ForceLayout);
      isG6Registered = true;
    } catch (fallbackError) {
      console.error(
        "Failed to register G6 extensions with fallback:",
        fallbackError
      );
      throw fallbackError;
    }
  } finally {
    // Clear the promise so future calls can check the flag directly
    registrationPromise = null;
  }
}

import type { Action } from "svelte/action";

type Edge = "left" | "right" | "top" | "bottom";

interface ResizableOptions {
  edges?: Edge[];
  onResize?: (dimensions: { width: number; height: number }) => void;
  enabled?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export const resizable: Action<HTMLElement, ResizableOptions> = (
  node,
  options = {}
) => {
  let {
    edges = ["left", "right", "top", "bottom"],
    onResize,
    enabled = true,
    minWidth = 0,
    maxWidth = Infinity,
    minHeight = 0,
    maxHeight = Infinity
  } = options;

  let resizing = false;
  let activeEdge: Edge | null = null;
  let startX: number;
  let startY: number;
  let startWidth: number;
  let startHeight: number;
  let handles: HTMLDivElement[] = [];
  let hitAreas: HTMLDivElement[] = [];
  let overlay: HTMLDivElement | null = null;
  let hoverTimeouts: Map<Edge, number> = new Map();
  let isAnyHandleVisible = false;

  function createHitArea(edge: Edge) {
    const hitArea = document.createElement("div");
    hitArea.style.position = "absolute";
    hitArea.style.zIndex = "20";
    hitArea.style.backgroundColor = "rgba(0, 0, 0, 0)";
    hitArea.dataset.edge = edge;

    // Set position and size
    switch (edge) {
      case "left":
        hitArea.style.top = "0";
        hitArea.style.left = "-5px";
        hitArea.style.width = "10px";
        hitArea.style.height = "100%";
        hitArea.style.cursor = "col-resize";
        break;
      case "right":
        hitArea.style.top = "0";
        hitArea.style.right = "-5px";
        hitArea.style.width = "10px";
        hitArea.style.height = "100%";
        hitArea.style.cursor = "col-resize";
        break;
      case "top":
        hitArea.style.top = "-5px";
        hitArea.style.left = "0";
        hitArea.style.width = "100%";
        hitArea.style.height = "10px";
        hitArea.style.cursor = "row-resize";
        break;
      case "bottom":
        hitArea.style.bottom = "-5px";
        hitArea.style.left = "0";
        hitArea.style.width = "100%";
        hitArea.style.height = "10px";
        hitArea.style.cursor = "row-resize";
        break;
    }

    node.appendChild(hitArea);

    hitArea.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      enabled && startResize(e, edge);
    });

    const handle = handles.find((h) => h.dataset.edge === edge);
    if (handle) {
      const showHandle = () => {
        if (enabled && !resizing) {
          clearTimeout(hoverTimeouts.get(edge));
          hitArea.style.backgroundColor = "rgba(0, 200, 0, 0.05)";
          handle.style.display = "block";
          isAnyHandleVisible = true;
        }
      };

      const hideHandle = () => {
        if (enabled && !resizing) {
          const timeoutId = window.setTimeout(() => {
            const isStillHovering =
              hitArea.matches(":hover") || handle.matches(":hover");
            if (!isStillHovering) {
              hitArea.style.backgroundColor = "rgba(0, 0, 0, 0)";
              handle.style.display = "none";
              checkIfAllHandlesHidden();
            }
          }, 100);
          hoverTimeouts.set(edge, timeoutId);
        }
      };

      hitArea.addEventListener("mouseenter", showHandle);
      hitArea.addEventListener("mouseleave", hideHandle);

      handle.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimeouts.get(edge));
      });
      handle.addEventListener("mouseleave", hideHandle);
    } else {
      console.warn(`No handle found for edge: ${edge}`);
    }

    return hitArea;
  }

  function createHandle(edge: Edge) {
    const handle = document.createElement("div");
    handle.className = `absolute ${getHandleClass(edge)}`;
    handle.style.display = "none";
    handle.dataset.edge = edge;
    handle.style.zIndex = "30";

    // Set the appropriate cursor for the handle
    switch (edge) {
      case "left":
      case "right":
        handle.style.cursor = "col-resize";
        break;
      case "top":
      case "bottom":
        handle.style.cursor = "row-resize";
        break;
    }

    node.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      enabled && startResize(e, edge);
    });

    handle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    handle.addEventListener("dragstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    handle.draggable = false;

    return handle;
  }

  function getHandleClass(edge: Edge): string {
    const baseClasses = "resizer bg-aps1 opacity-50 pointer-events-auto";
    switch (edge) {
      case "left":
        return `${baseClasses} top-0 left-0 w-1.5 h-full`;
      case "right":
        return `${baseClasses} top-0 right-0 w-1.5 h-full`;
      case "top":
        return `${baseClasses} top-0 left-0 w-full h-1.5`;
      case "bottom":
        return `${baseClasses} bottom-0 left-0 w-full h-1.5`;
    }
  }

  /**
   * To prevents click events on the node which is being resized at the end of the resizing process
   */
  function createOverlay() {
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function startResize(e: MouseEvent, edge: Edge) {
    if (!enabled) return;
    resizing = true;
    activeEdge = edge;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = node.offsetWidth;
    startHeight = node.offsetHeight;

    const handle = handles.find((h) => h.dataset.edge === edge);
    if (handle) {
      handle.style.display = "block";
    }

    createOverlay();
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  }

  function resize(e: MouseEvent) {
    if (!resizing || !activeEdge || !enabled) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    switch (activeEdge) {
      case "left":
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - dx));
        node.style.width = `${newWidth}px`;
        break;
      case "right":
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
        node.style.width = `${newWidth}px`;
        break;
      case "top":
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - dy));
        node.style.height = `${newHeight}px`;
        break;
      case "bottom":
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + dy));
        node.style.height = `${newHeight}px`;
        break;
    }

    if (onResize) {
      onResize({ width: newWidth, height: newHeight });
    }
  }

  function stopResize() {
    resizing = false;
    activeEdge = null;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);

    hitAreas.forEach((hitArea) => {
      const edge = hitArea.dataset.edge as Edge;
      const handle = handles.find((h) => h.dataset.edge === edge);

      if (handle && enabled) {
        const isStillHovering =
          hitArea.matches(":hover") || handle.matches(":hover");
        if (!isStillHovering) {
          handle.style.display = "none";
          hitArea.style.backgroundColor = "rgba(0, 0, 0, 0)";
        }
      }
    });

    checkIfAllHandlesHidden();
    removeOverlay();
  }

  function setupHandles() {
    removeHandles();

    handles = edges.map(createHandle);
    hitAreas = edges.map(createHitArea);

    const computedStyle = window.getComputedStyle(node);
    if (computedStyle.position === "static") {
      node.style.position = "relative";
    }

    node.style.overflow = "visible";
  }

  function removeHandles() {
    hoverTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    hoverTimeouts.clear();

    handles.forEach((handle) => handle.remove());
    handles = [];
    hitAreas.forEach((area) => area.remove());
    hitAreas = [];
    isAnyHandleVisible = false;
  }

  function updateHandles() {
    if (enabled) {
      setupHandles();
    } else {
      removeHandles();
    }
  }

  function checkIfAllHandlesHidden() {
    const anyVisible = handles.some(
      (handle) => handle.style.display === "block"
    );
    isAnyHandleVisible = anyVisible;
  }

  updateHandles();

  return {
    update(newOptions: ResizableOptions) {
      Object.assign(options, newOptions);
      if (
        newOptions.edges &&
        newOptions.edges.toString() !== edges.toString()
      ) {
        removeHandles();
        edges.length = 0;
        edges.push(...newOptions.edges);
      }
      if (newOptions.enabled !== undefined) {
        enabled = newOptions.enabled;
      }
      if (newOptions.minWidth !== undefined) minWidth = newOptions.minWidth;
      if (newOptions.maxWidth !== undefined) maxWidth = newOptions.maxWidth;
      if (newOptions.minHeight !== undefined) minHeight = newOptions.minHeight;
      if (newOptions.maxHeight !== undefined) maxHeight = newOptions.maxHeight;
      if (newOptions.onResize !== undefined) onResize = newOptions.onResize;
      updateHandles();
    },
    destroy() {
      removeHandles();
      removeOverlay();
    }
  };
};

export function resizeListener(
  node: HTMLElement | SVGElement,
  callback: (dimensions: { width: number; height: number }) => void
) {
  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      callback({ width: Math.round(width), height: Math.round(height) });
    }
  });

  resizeObserver.observe(node);

  return {
    destroy() {
      resizeObserver.disconnect();
    },
    update(
      newCallback: (dimensions: { width: number; height: number }) => void
    ) {
      callback = newCallback;
    }
  };
}

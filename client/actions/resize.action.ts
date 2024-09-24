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

const resizable: Action<HTMLElement, ResizableOptions> = (
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

  function createHandle(edge: Edge) {
    const handle = document.createElement("div");
    handle.className = `absolute ${getHandleClass(edge)}`;
    handle.style.display = "none";
    node.appendChild(handle);

    handle.addEventListener(
      "mouseenter",
      () => enabled && (handle.style.display = "block")
    );
    handle.addEventListener("mouseleave", () => {
      if (!resizing && enabled) handle.style.display = "none";
    });
    handle.addEventListener(
      "mousedown",
      (e) => enabled && startResize(e, edge)
    );

    return handle;
  }

  function getHandleClass(edge: Edge): string {
    const baseClasses = "bg-aps1 opacity-50 z-10";
    switch (edge) {
      case "left":
        return `${baseClasses} top-0 left-0 w-1.5 h-full cursor-col-resize`;
      case "right":
        return `${baseClasses} top-0 right-0 w-1.5 h-full cursor-col-resize`;
      case "top":
        return `${baseClasses} top-0 left-0 w-full h-1.5 cursor-row-resize`;
      case "bottom":
        return `${baseClasses} bottom-0 left-0 w-full h-1.5 cursor-row-resize`;
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
    handles.forEach((handle) => {
      if (!handle.matches(":hover") && enabled) {
        handle.style.display = "none";
      }
    });
  }

  function setupHandles() {
    handles = edges.map(createHandle);
  }

  function removeHandles() {
    handles.forEach((handle) => handle.remove());
    handles = [];
  }

  function updateHandles() {
    if (enabled) {
      setupHandles();
    } else {
      removeHandles();
    }
  }

  node.addEventListener("mouseenter", () => {
    if (enabled) {
      handles.forEach((handle) => (handle.style.display = "block"));
    }
  });

  node.addEventListener("mouseleave", () => {
    if (!resizing && enabled) {
      handles.forEach((handle) => (handle.style.display = "none"));
    }
  });

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
    }
  };
};

export default resizable;

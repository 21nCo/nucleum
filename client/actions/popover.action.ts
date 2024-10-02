import { tick } from "svelte";
import { Placement } from "../types/direction.enum";

export function popover(
  node,
  { component, props = {}, position = "bottom", show = false }
) {
  let popoverElement: HTMLElement | null;

  function createPopover() {
    if (popoverElement) return;

    popoverElement = document.createElement("div");
    popoverElement.style.position = "fixed";
    popoverElement.style.zIndex = "1000";
    popoverElement.style.display = show ? "block" : "none";
    document.body.appendChild(popoverElement);

    new component({
      target: popoverElement,
      props: props
    });

    positionPopover();
    window.addEventListener("scroll", positionPopover);
    window.addEventListener("resize", positionPopover);
  }

  function positionPopover() {
    if (!popoverElement) return;

    const rect = node.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();

    let top, left;

    switch (position) {
      case "top":
        top = rect.top - popoverRect.height;
        left = rect.left + rect.width / 2 - popoverRect.width / 2;
        break;
      case "bottom":
        top = rect.bottom;
        left = rect.left + rect.width / 2 - popoverRect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - popoverRect.height / 2;
        left = rect.left - popoverRect.width;
        break;
      case "right":
        top = rect.top + rect.height / 2 - popoverRect.height / 2;
        left = rect.right;
        break;
    }

    popoverElement.style.top = `${top}px`;
    popoverElement.style.left = `${left}px`;
  }

  function destroyPopover() {
    if (popoverElement) {
      document.body.removeChild(popoverElement);
      window.removeEventListener("scroll", positionPopover);
      window.removeEventListener("resize", positionPopover);
      popoverElement = null;
    }
  }

  function updateVisibility(shouldShow) {
    if (popoverElement) {
      popoverElement.style.display = shouldShow ? "block" : "none";
    }
  }

  createPopover();

  return {
    update(newParams) {
      props = newParams.props || {};
      position = newParams.position || "bottom";

      if (newParams.show !== undefined && newParams.show !== show) {
        show = newParams.show;
        updateVisibility(show);
      }

      if (popoverElement) {
        destroyPopover();
        createPopover();
      }
    },
    destroy() {
      destroyPopover();
    }
  };
}

interface TooltipParams {
  text: string;
  classList?: string;
  direction?: Placement;
  offsetInPx?: number;
}

interface TooltipReturn {
  update: (newParams: TooltipParams) => void;
  destroy: () => void;
}

interface TooltipParams {
  text: string;
  classList?: string;
  direction?: Placement;
  offsetInPx?: number;
}

interface TooltipReturn {
  update: (newParams: TooltipParams) => void;
  destroy: () => void;
}

export function tooltip(
  node: HTMLElement,
  params: TooltipParams
): TooltipReturn {
  let tooltipElement: HTMLDivElement | null = null;
  let { text, classList = "", direction = "top", offsetInPx = 10 } = params;
  const baseClassList =
    "fixed px-3 bg-fgs2 text-bgs1 py-1 text-b3 shadow-md rounded-md pointer-events-none opacity-0 transition-opacity duration-200";
  function createTooltip(): void {
    tooltipElement = document.createElement("div");
    tooltipElement.textContent = text;
    tooltipElement.className = `${baseClassList} ${classList}`;
    node.appendChild(tooltipElement);
  }

  function positionTooltip(): void {
    if (!tooltipElement) return;

    const rect = node.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    let left = 0;
    let top = 0;
    let actualDirection = direction;

    function calculatePosition(dir: Placement): {
      left: number;
      top: number;
      fits: boolean;
    } {
      switch (dir) {
        case "top":
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          top = rect.top - tooltipRect.height - offsetInPx;
          return {
            left,
            top,
            fits:
              top >= 0 &&
              left >= 0 &&
              left + tooltipRect.width <= window.innerWidth
          };
        case "bottom":
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          top = rect.bottom + offsetInPx;
          return {
            left,
            top,
            fits:
              top + tooltipRect.height <= window.innerHeight &&
              left >= 0 &&
              left + tooltipRect.width <= window.innerWidth
          };
        case "left":
          left = rect.left - tooltipRect.width - offsetInPx;
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          return {
            left,
            top,
            fits:
              left >= 0 &&
              top >= 0 &&
              top + tooltipRect.height <= window.innerHeight
          };
        case "right":
          left = rect.right + offsetInPx;
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          return {
            left,
            top,
            fits:
              left + tooltipRect.width <= window.innerWidth &&
              top >= 0 &&
              top + tooltipRect.height <= window.innerHeight
          };
      }
    }

    let position = calculatePosition(actualDirection);

    if (!position.fits) {
      const oppositeDirections: Record<Placement, Placement> = {
        top: Placement.Bottom,
        bottom: Placement.Top,
        left: Placement.Right,
        right: Placement.Left
      };

      actualDirection = oppositeDirections[actualDirection];
      position = calculatePosition(actualDirection);

      // If opposite direction also doesn't fit, try to adjust within the original direction
      if (!position.fits) {
        position = calculatePosition(direction);
        if (direction === "top" || direction === "bottom") {
          position.left = Math.max(
            offsetInPx,
            Math.min(
              position.left,
              window.innerWidth - tooltipRect.width - offsetInPx
            )
          );
        } else {
          position.top = Math.max(
            offsetInPx,
            Math.min(
              position.top,
              window.innerHeight - tooltipRect.height - offsetInPx
            )
          );
        }
      }
    }

    tooltipElement.style.left = `${position.left}px`;
    tooltipElement.style.top = `${position.top}px`;
  }

  function showTooltip(): void {
    if (tooltipElement) tooltipElement.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipElement) tooltipElement.style.opacity = "0";
  }

  function onMouseEnter(): void {
    createTooltip();
    tick().then(() => {
      positionTooltip();
      showTooltip();
    });
  }

  function onMouseLeave(): void {
    hideTooltip();
    setTimeout(() => {
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
        tooltipElement = null;
      }
    }, 200);
  }

  node.addEventListener("mouseenter", onMouseEnter);
  node.addEventListener("mouseleave", onMouseLeave);

  return {
    update(newParams: TooltipParams): void {
      ({
        text,
        classList = "",
        direction = "top",
        offsetInPx = 10
      } = newParams);
      if (tooltipElement) {
        tooltipElement.textContent = text;
        tooltipElement.className = `${baseClassList} ${classList}`;
        positionTooltip();
      }
    },
    destroy(): void {
      node.removeEventListener("mouseenter", onMouseEnter);
      node.removeEventListener("mouseleave", onMouseLeave);
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
    }
  };
}

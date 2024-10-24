import { tick } from "svelte";
import { Placement } from "../types/direction.enum";
import { PopoverTriggerMethod } from "../types/popover.type";
import { deepCopy } from "$lib/shared/utils/obj.utils";
import { getEventPath } from "../utils/browser.utils";

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
  delay?: number;
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
  let {
    text,
    classList = "",
    direction = Placement.Bottom,
    offsetInPx = 10,
    delay = 300
  } = params;
  const baseClassList =
    "fixed z-50 px-3 bg-fgs2 text-bgs1 py-1 text-b3 shadow-md rounded-md pointer-events-none opacity-0 transition-opacity duration-200 tooltip";
  function createTooltip(): void {
    tooltipElement = document.createElement("div");
    tooltipElement.textContent = text;
    tooltipElement.className = `${baseClassList} ${classList}`;
    const baseBodyElement = document.getElementById("base");
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

    if (!position?.fits) {
      const oppositeDirections: Record<Placement, Placement> = {
        top: Placement.Bottom,
        bottom: Placement.Top,
        left: Placement.Right,
        right: Placement.Left
      };

      actualDirection = oppositeDirections[actualDirection];
      position = calculatePosition(actualDirection);

      // If opposite direction also doesn't fit, try to adjust within the original direction
      if (!position?.fits) {
        position = calculatePosition(direction);
        if (direction === "top" || direction === "bottom") {
          position.left = Math.max(
            offsetInPx,
            Math.min(
              position.left,
              window.innerWidth - tooltipRect.width - offsetInPx
            )
          );
        } else if (position) {
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

    tooltipElement.style.left = `${position?.left}px`;
    tooltipElement.style.top = `${position?.top}px`;
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
      setTimeout(() => {
        showTooltip();
      }, delay);
    });
  }

  function onMouseLeave(): void {
    if (tooltipElement && tooltipElement.parentNode) {
      tooltipElement.parentNode.removeChild(tooltipElement);
      tooltipElement = null;
    }
    removeAllTraces();
  }

  function removeAllTraces(): void {
    node.querySelectorAll(".tooltip").forEach((el) => {
      el?.parentNode?.removeChild(el);
    });
  }

  node.addEventListener("mouseenter", onMouseEnter);
  node.addEventListener("mouseleave", onMouseLeave);

  return {
    update(newParams: TooltipParams): void {
      ({
        text,
        classList = "",
        direction = "top",
        offsetInPx = 10,
        delay = 300
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
        tooltipElement?.parentNode?.removeChild(tooltipElement);
        removeAllTraces();
      }
    }
  };
}

function documentDimensions() {
  const body = document.body;
  const html = document.documentElement;

  const documentWidth = Math.max(
    body.scrollWidth,
    body.offsetWidth,
    html.clientWidth,
    html.scrollWidth,
    html.offsetWidth
  );

  const documentHeight = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  );

  return { documentWidth, documentHeight };
}

type Content = string | HTMLElement | ConstructorOfATypedSvelteComponent;

interface PopoverParams {
  placement?: Placement;
  isSpanToTriggerWidth?: boolean;
  offsetInPx?: number;
  content: Content;
  triggerMethod?: PopoverTriggerMethod[];
  componentProps?: Record<string, any>;
  groupId?: string;
  id?: string;
  /**
   * If set to true, the popover will be rendered as a sibling of the trigger element. By default, popovers are rendered in popovers container to avoid z-index issues with other elements in the DOM.
   */
  isRenderAsSibling?: boolean;
}

export function popover(node: HTMLElement, params: PopoverParams) {
  let popoverElement: HTMLElement | null = null;
  let component: ConstructorOfATypedSvelteComponent | null = null;
  let {
    placement = Placement.BottomCenter,
    isSpanToTriggerWidth = false,
    offsetInPx = 4,
    content,
    triggerMethod = [PopoverTriggerMethod.CLICK],
    componentProps = {},
    groupId = "popover",
    id = "popover",
    isRenderAsSibling = false
  } = params;

  let isShown = false;
  let lastTriggeredBy: PopoverTriggerMethod | null = null;
  let popoverContainer = document.getElementById("popovers");

  async function createPopover(): Promise<void> {
    popoverElement = document.createElement("div");
    popoverElement.className =
      "fixed shadow-lg rounded-md overflow-hidden popover";
    popoverElement.style.zIndex = "50";
    popoverElement.id = id;
    popoverElement.setAttribute("data-group-id", groupId);

    // node.appendChild(popoverElement);

    if (isRenderAsSibling && node.parentNode) {
      node.parentNode.insertBefore(popoverElement, node.nextSibling);
    } else {
      popoverContainer?.appendChild(popoverElement);
    }

    if (typeof content === "string") {
      popoverElement.textContent = content;
    } else if (content instanceof HTMLElement) {
      popoverElement.appendChild(content);
    } else if (typeof content === "function") {
      component = new content({
        target: popoverElement,
        props: componentProps
      });
    }

    await tick();
  }

  function positionPopover(): void {
    if (!popoverElement) return;

    const triggerRect = node.getBoundingClientRect();
    popoverElement.style.display = "block";
    popoverElement.style.opacity = "0";

    let popRect = popoverElement.getBoundingClientRect();
    const { documentWidth, documentHeight } = documentDimensions();
    if (triggerRect.top < popRect.height) {
      if (placement === Placement.TopLeft) placement = Placement.BottomLeft;
      else if (placement === Placement.TopRight)
        placement = Placement.BottomRight;
      else if (placement === Placement.TopCenter)
        placement = Placement.BottomCenter;
    }
    if (triggerRect.top < popRect.height / 2) {
      if (placement === Placement.Left) placement = Placement.BottomRight;
      else if (placement === Placement.Right) placement = Placement.BottomLeft;
    }
    if (documentHeight - triggerRect.bottom < popRect.height) {
      if (placement === Placement.BottomCenter) placement = Placement.TopCenter;
      else if (placement === Placement.BottomLeft)
        placement = Placement.TopLeft;
      else if (placement === Placement.BottomRight)
        placement = Placement.TopRight;
    }
    if (documentHeight - triggerRect.bottom < popRect.height / 2) {
      if (placement === Placement.Left) placement = Placement.TopRight;
      else if (placement === Placement.Right) placement = Placement.TopLeft;
    }
    if (
      triggerRect.top < popRect.height &&
      documentHeight - triggerRect.bottom < popRect.height
    ) {
      placement = Placement.Left;
    }
    if (!isSpanToTriggerWidth) {
      if (documentWidth - triggerRect.right < popRect.width) {
        if (placement === Placement.Right) placement = Placement.Left;
        if (placement === Placement.BottomCenter)
          placement = Placement.BottomRight;
        if (placement === Placement.TopCenter) placement = Placement.TopRight;
      }
      if (triggerRect.left < popRect.width) {
        if (placement === Placement.Left) placement = Placement.Right;
        if (placement === Placement.BottomCenter)
          placement = Placement.BottomLeft;
        if (placement === Placement.TopCenter) placement = Placement.TopLeft;
      }
    }

    if (placement === Placement.BottomLeft || placement === Placement.TopLeft) {
      popoverElement.style.left = `${triggerRect.left}px`;
      popoverElement.style.right = "";
    } else if (
      placement === Placement.BottomRight ||
      placement === Placement.TopRight
    ) {
      popoverElement.style.right = `${documentWidth - triggerRect.right}px`;
      popoverElement.style.left = "";
    }
    if (
      placement === Placement.TopLeft ||
      placement === Placement.TopRight ||
      placement === Placement.TopCenter
    ) {
      popoverElement.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
      popoverElement.style.top = "";
    } else if (
      placement === Placement.BottomLeft ||
      placement === Placement.BottomRight ||
      placement === Placement.BottomCenter
    ) {
      popoverElement.style.top = `${triggerRect.bottom + offsetInPx}px`;
      popoverElement.style.bottom = "";
    }

    if (placement === Placement.Right) {
      popoverElement.style.left = `${triggerRect.right + offsetInPx}px`;
      popoverElement.style.top = `${triggerRect.top + triggerRect.height / 2 - popRect.height / 2}px`;
    } else if (placement === Placement.Left) {
      popoverElement.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
      popoverElement.style.top = `${triggerRect.top + triggerRect.height / 2 - popRect.height / 2}px`;
    } else if (
      placement === Placement.TopCenter ||
      placement === Placement.BottomCenter
    ) {
      if (isSpanToTriggerWidth) {
        popoverElement.style.left = `${triggerRect.left}px`;
      } else {
        popoverElement.style.left = `${triggerRect.left + triggerRect.width / 2 - popRect.width / 2}px`;
      }
    }

    popRect = popoverElement.getBoundingClientRect();
    if (popRect.width > documentWidth) {
      popoverElement.style.width = `${documentWidth - 12}px`;
    }
    if (popRect.left < 0 || popRect.right > documentWidth) {
      popoverElement.style.left = "6px";
      popoverElement.style.right = "6px";
    }
    if (isSpanToTriggerWidth)
      popoverElement.style.width = `${triggerRect.width}px`;

    popoverElement.style.opacity = "1";
  }

  async function showPopover(e?: any): Promise<void> {
    // console.log("showPopover", e, popoverElement);
    if (!popoverElement) await createPopover();
    positionPopover();
    isShown = true;
    triggerChangeEvent();
    document.addEventListener("click", handleOutsideClickv2);
  }

  function hidePopover(e?: any): void {
    // console.log("hidePopover", e);
    if (popoverElement) {
      if (isRenderAsSibling && node.parentNode) {
        node.parentNode.removeChild(popoverElement);
      } else {
        popoverContainer?.removeChild(popoverElement);
      }
      popoverElement = null;
      if (component) {
        component.$destroy();
        component = null;
      }
    }
    isShown = false;
    triggerChangeEvent();
    document.removeEventListener("click", handleOutsideClickv2);
  }

  function triggerChangeEvent(): void {
    const event = new CustomEvent("change", {
      detail: { open: isShown }
    });
    node.dispatchEvent(event);
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (
      popoverElement &&
      !popoverElement.contains(event.target as Node) &&
      !node.contains(event.target as Node)
    ) {
      hidePopover("outside click");
    }
  }
  function handleOutsideClickv2(event: MouseEvent): void {
    if (popoverElement && node) {
      const target = event.target as Element;
      const path =
        (event.composedPath && event.composedPath()) ||
        event.path ||
        (event.target && getEventPath(event));
      if (target.tagName.toLowerCase() === "path") {
        const svgParent = target.closest("svg");
        // console.log("svgParent", path, svgParent);
        if (svgParent) {
          if (node.contains(svgParent) || popoverElement.contains(svgParent)) {
            return;
          }
        } else if (path) {
          const isInsideNodeOrPopover = path.some(
            (element) =>
              element instanceof SVGElement ||
              node.contains(element as Node) ||
              popoverElement?.contains(element as Node)
          );
          if (isInsideNodeOrPopover) {
            return;
          }
        }
      }

      if (!popoverElement.contains(target) && !node.contains(target)) {
        hidePopover("outside click");
      }
    }
  }

  function handleTrigger(event: MouseEvent | TouchEvent): void {
    if (
      triggerMethod.includes(PopoverTriggerMethod.CLICK) &&
      event.type === "click"
    ) {
      event.preventDefault();
      if (isShown && lastTriggeredBy === PopoverTriggerMethod.CLICK) {
        hidePopover("click");
        lastTriggeredBy = null;
        return;
      } else if (isShown) {
        lastTriggeredBy = PopoverTriggerMethod.CLICK;
      } else if (!isShown) {
        showPopover(event);
        lastTriggeredBy = PopoverTriggerMethod.CLICK;
      }
    } else if (
      triggerMethod.includes(PopoverTriggerMethod.RIGHT_CLICK) &&
      event.type === "contextmenu"
    ) {
      event.preventDefault();
      lastTriggeredBy = PopoverTriggerMethod.RIGHT_CLICK;
      isShown ? hidePopover("right click") : showPopover();
    } else if (
      triggerMethod.includes(PopoverTriggerMethod.HOVER) &&
      event.type === "mouseenter"
    ) {
      // triggeredBy = PopoverTriggerMethod.HOVER;
      showPopover();
    } else if (
      triggerMethod.includes(PopoverTriggerMethod.HOVER) &&
      event.type === "mouseleave"
    ) {
      console.log("mouseleave", lastTriggeredBy, triggerMethod);
      if (
        isShown &&
        !(
          triggerMethod.includes(PopoverTriggerMethod.CLICK) &&
          lastTriggeredBy === PopoverTriggerMethod.CLICK
        )
      )
        hidePopover();
    }
  }

  function setupEventListeners(): void {
    if (triggerMethod.includes(PopoverTriggerMethod.HOVER)) {
      node.addEventListener("mouseenter", handleTrigger);
      node.addEventListener("mouseleave", handleTrigger);
    }
    if (triggerMethod.includes(PopoverTriggerMethod.CLICK)) {
      node.addEventListener("click", handleTrigger);
    }
    if (triggerMethod.includes(PopoverTriggerMethod.RIGHT_CLICK)) {
      node.addEventListener("contextmenu", handleTrigger);
    }
    node.addEventListener("hide", hidePopover);
    node.addEventListener("show", showPopover);
  }

  function removeEventListeners(): void {
    if (triggerMethod.includes(PopoverTriggerMethod.HOVER)) {
      node.removeEventListener("mouseenter", handleTrigger);
      node.removeEventListener("mouseleave", handleTrigger);
    }
    if (triggerMethod.includes(PopoverTriggerMethod.CLICK)) {
      node.removeEventListener("click", handleTrigger);
    }
    if (triggerMethod.includes(PopoverTriggerMethod.RIGHT_CLICK)) {
      node.removeEventListener("contextmenu", handleTrigger);
    }
    node.removeEventListener("hide", hidePopover);
    node.removeEventListener("show", showPopover);
  }

  setupEventListeners();
  const actionMap = new WeakMap();
  actionMap.set(node, { show: showPopover, hide: hidePopover });

  return {
    update(newParams: PopoverParams): void {
      ({
        placement = Placement.BottomCenter,
        isSpanToTriggerWidth = false,
        offsetInPx = 4,
        content,
        triggerMethod = [PopoverTriggerMethod.CLICK],
        componentProps = {},
        groupId = "popover",
        id = "popover",
        isRenderAsSibling = false
      } = newParams);
      if (popoverElement) {
        positionPopover();
      }
    },
    destroy(): void {
      removeEventListeners();
      hidePopover("destroy");
    }
  };
}

export {  PopoverTriggerMethod as TriggerMethod };

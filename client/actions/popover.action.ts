import { tick } from "svelte";

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

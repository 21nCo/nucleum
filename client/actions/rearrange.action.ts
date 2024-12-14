import type { Action } from "svelte/action";

interface RearrangeParams {
  onRearrange: (displacement: number) => void;
  onRearranged: (displacement: number) => void;
  threshold?: number;
  enabled: boolean;
}

/**
 * Rearranges on X axis without lifting items.
 * @param node
 * @param params
 * @returns
 */
export const rearrangeOnAxis: Action<HTMLElement, RearrangeParams> = (
  node,
  params
) => {
  let isDragging = false;
  let startX: number | null = null;
  let lastMouseX: number | null = null;
  let translateX = 0;
  let prevTranslateX = 0;
  let rafId: number | null = null;
  let isFloatingToDestinationMode = false;
  let displacement = 0;
  let offsetX = 0;
  let prevMoveDirection: "forward" | "backward" | null = null;
  let moveDirection: "forward" | "backward" | null = null;

  const threshold = params.threshold || 30;
  const moveThreshold = 5;

  function hidePopovers() {
    const popovers = node.querySelectorAll(".popover");
    popovers.forEach((popover) => {
      (popover as HTMLElement).style.visibility = "hidden";
    });
  }

  function showPopovers() {
    const popovers = node.querySelectorAll(".popover");
    popovers.forEach((popover) => {
      (popover as HTMLElement).style.visibility = "visible";
    });
  }

  function onMouseDown(e: MouseEvent) {
    if (!params.enabled) return;
    startX = e.clientX;
    lastMouseX = startX;
    const left = node.getBoundingClientRect().left;
    offsetX = e.clientX - left;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(event: MouseEvent) {
    if (!params.enabled || isTextElementFocused()) return;
    lastMouseX = event.clientX;
    if (!isDragging && Math.abs(lastMouseX - (startX ?? 0)) > moveThreshold) {
      isDragging = true;
      isFloatingToDestinationMode = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
      hidePopovers();
    }
  }

  function handleMouseUp() {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    if (isDragging) {
      params.onRearranged(displacement);
      isFloatingToDestinationMode = false;
      translateX = 0;
      if (rafId) cancelAnimationFrame(rafId);
      node.style.transform = "";
      showPopovers();
    }

    isDragging = false;
  }

  function updatePosition() {
    if (isDragging && startX !== null && lastMouseX !== null) {
      translateX = lastMouseX - startX;

      if (!isFloatingToDestinationMode) {
        displacement = translateX;
      }
      if (Math.abs(displacement) > threshold && !isFloatingToDestinationMode) {
        params.onRearrange(displacement);
        isFloatingToDestinationMode = true;
        setTimeout(() => {
          const left = node.getBoundingClientRect().left;
          startX = left + offsetX;
          prevTranslateX = lastMouseX - startX;
        }, 1);
      }
      if (prevTranslateX < translateX) {
        moveDirection = "forward";
      } else if (prevTranslateX > translateX) {
        moveDirection = "backward";
      }
      if (
        prevTranslateX * translateX < 0 ||
        prevMoveDirection !== moveDirection
      ) {
        isFloatingToDestinationMode = false;
      }
      prevTranslateX = translateX;
      prevMoveDirection = moveDirection;
      node.style.transform = `translateX(${translateX}px)`;
      rafId = requestAnimationFrame(updatePosition);
    }
  }

  node.addEventListener("mousedown", onMouseDown);

  return {
    destroy() {
      node.removeEventListener("mousedown", onMouseDown);
    },
    update(newParams: RearrangeParams) {
      params = newParams;
    }
  };
};

function isTextElementFocused() {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  );
}

interface DragDropOptions {
  listId: string;
  draggedOverClass: string;
  onDrop?: (e: DragDropEvent) => void;
}

export interface DragDropEvent {
  from: number;
  to: number;
  fromId?: string;
  toId?: string;
  fromGroupId?: string;
  toGroupId?: string;
  listId: string;
}

/**
 * Use this action to enable reordering of items in a list.
 *
 * Emits a custom event "reorder" with the following payload:
 * { from: number; to: number; listId: string }
 *
 * Note: the items in the list should contain attribute `data-index` or class `row` for the item to be reorderable
 *
 * @param node
 * @param options
 * @returns
 */
export const reorderList: Action<HTMLElement, DragDropOptions> = (
  node,
  options
) => {
  let draggedOverClasses = (options?.draggedOverClass || "dragged-over").split(
    " "
  );
  let listId = options?.listId || "default-list";

  function handleDragStart(e: DragEvent) {
    if (isTextElementFocused()) {
      e.preventDefault();
      return;
    }
    if (!(e.target instanceof HTMLElement) || !e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", e.target.dataset.index || "");
    e.dataTransfer.setData("text/group-id", e.target.dataset.groupId || "");
    e.dataTransfer.setData("text/id", e.target.dataset.id || "");
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    const target = findDraggableParent(e.target as HTMLElement);
    if (target) {
      target.classList.add(...draggedOverClasses);
    }
  }

  function handleDragLeave(e: DragEvent) {
    const target = findDraggableParent(e.target as HTMLElement);
    if (target) {
      target.classList.remove(...draggedOverClasses);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const target = findDraggableParent(e.target as HTMLElement);
    if (!target) return;

    target.classList.remove(...draggedOverClasses);

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain") || "-1");
    const fromGroupId = e.dataTransfer.getData("text/group-id");
    const fromId = e.dataTransfer.getData("text/id");
    const toIndex = parseInt(target.dataset.index || "-1");
    const toGroupId = target.dataset.groupId;
    const toId = target.dataset.id;

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      options.onDrop?.({
        from: fromIndex,
        to: toIndex,
        fromGroupId,
        toGroupId,
        fromId,
        toId,
        listId
      });
      node.dispatchEvent(
        new CustomEvent<DragDropEvent>("reorder", {
          detail: {
            from: fromIndex,
            to: toIndex,
            fromGroupId,
            toGroupId,
            fromId,
            toId,
            listId
          },
          bubbles: true
        })
      );
    }
  }

  function findDraggableParent(
    element: HTMLElement | null
  ): HTMLElement | null {
    while (element && element !== node) {
      if (
        element.dataset.index !== undefined ||
        element.classList.contains("row")
      ) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  node.addEventListener("dragstart", handleDragStart);
  node.addEventListener("dragover", handleDragOver);
  node.addEventListener("dragleave", handleDragLeave);
  node.addEventListener("drop", handleDrop);

  return {
    update(newOptions: DragDropOptions) {
      draggedOverClasses = newOptions.draggedOverClass.split(" ");
      listId = newOptions.listId;
    },
    destroy() {
      node.removeEventListener("dragstart", handleDragStart);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
    }
  };
};

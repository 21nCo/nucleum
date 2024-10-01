import type { Action } from "svelte/action";

interface DragDropOptions {
  listId: string;
  draggedOverClass: string;
}

interface DragDropEvent {
  from: number;
  to: number;
  listId: string;
}

export const dragDropList: Action<HTMLElement, DragDropOptions> = (
  node,
  options
) => {
  let draggedOverClasses = (options?.draggedOverClass || "dragged-over").split(
    " "
  );
  let listId = options?.listId || "default-list";

  function handleDragStart(e: DragEvent) {
    if (!(e.target instanceof HTMLElement) || !e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", e.target.dataset.index || "");
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
    const toIndex = parseInt(target.dataset.index || "-1");

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      node.dispatchEvent(
        new CustomEvent<DragDropEvent>("rearrange", {
          detail: { from: fromIndex, to: toIndex, listId },
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

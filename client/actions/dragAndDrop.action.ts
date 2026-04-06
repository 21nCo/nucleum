interface DropzoneOptions {
  duringDragoverClasses?: string;
  itemRequirement?: string;
  onDrop?: (details: DroppedNodeDetails) => void;
  enabled?: boolean;
}

interface DroppedNodeDetails {
  id: string;
  dataAttributes: Record<string, string>;
}

interface DropzoneActionReturn {
  destroy: () => void;
  update: (options: DropzoneOptions) => void;
}

export function dropzone(
  node: HTMLElement,
  options: DropzoneOptions = {}
): DropzoneActionReturn {
  let {
    duringDragoverClasses = "",
    itemRequirement = "",
    onDrop = () => {},
    enabled = true
  } = options;

  let draggedElement: HTMLElement | null = null;

  function handleDragStart(event: DragEvent): void {
    if (!enabled) return;
    const target = event.target as HTMLElement;
    draggedElement = target.closest(`.${itemRequirement}`);
  }

  function handleDragEnter(event: DragEvent): void {
    if (!enabled) return;
    event.preventDefault();
    if (draggedElement) {
      node.classList.add(...duringDragoverClasses.split(" "));
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (!enabled) return;
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent): void {
    if (!enabled) return;
    if (!node.contains(event.relatedTarget as Node)) {
      node.classList.remove(...duringDragoverClasses.split(" "));
    }
  }

  function handleDrop(event: DragEvent): void {
    if (!enabled) return;
    event.preventDefault();
    node.classList.remove(...duringDragoverClasses.split(" "));

    if (draggedElement) {
      const nodeDetails: DroppedNodeDetails = {
        id: draggedElement.id,
        dataAttributes: Object.fromEntries(
          Object.entries(draggedElement.dataset).map(([key, value]) => [
            `data-${key}`,
            value ?? ""
          ])
        )
      };

      onDrop(nodeDetails);
      node.dispatchEvent(
        new CustomEvent<DroppedNodeDetails>("drop", {
          detail: nodeDetails
        })
      );
    }

    draggedElement = null;
  }

  function handleDragEnd(): void {
    if (!enabled) return;
    draggedElement = null;
    node.classList.remove(...duringDragoverClasses.split(" "));
  }

  function addListeners(): void {
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragend", handleDragEnd);
    node.addEventListener("dragenter", handleDragEnter);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("drop", handleDrop);
  }

  function removeListeners(): void {
    document.removeEventListener("dragstart", handleDragStart);
    document.removeEventListener("dragend", handleDragEnd);
    node.removeEventListener("dragenter", handleDragEnter);
    node.removeEventListener("dragleave", handleDragLeave);
    node.removeEventListener("dragover", handleDragOver);
    node.removeEventListener("drop", handleDrop);
  }

  if (enabled) {
    addListeners();
  }

  return {
    destroy() {
      removeListeners();
    },
    update(newOptions: DropzoneOptions) {
      duringDragoverClasses =
        newOptions.duringDragoverClasses ?? duringDragoverClasses;
      itemRequirement = newOptions.itemRequirement ?? itemRequirement;
      onDrop = newOptions.onDrop ?? onDrop;

      if (newOptions.enabled !== undefined && newOptions.enabled !== enabled) {
        enabled = newOptions.enabled;
        if (enabled) {
          addListeners();
        } else {
          removeListeners();
        }
      }
    }
  };
}

export interface DragSelectionConfig {
  /** Selector for selectable elements within the container */
  selectableSelector: string;

  /** Callback when selection changes */
  onSelectionChange?: (
    selectedElements: HTMLElement[],
    selectedIds: string[]
  ) => void;

  /** Callback for selection start */
  onSelectionStart?: () => void;

  /** Callback for selection end */
  onSelectionEnd?: (
    selectedElements: HTMLElement[],
    selectedIds: string[]
  ) => void;

  /** Whether to allow multi-selection with Ctrl/Cmd */
  allowMultiSelect?: boolean;

  /** Whether to show visual selection rectangle */
  showSelectionRect?: boolean;

  /** Custom class for selection rectangle */
  selectionRectClass?: string;

  /** Function to extract ID from element */
  getElementId?: (element: HTMLElement) => string;

  /** Whether to prevent default text selection */
  preventTextSelection?: boolean;
  /**
   * ID of the container element to listen for events on
   * If not provided, the action will listen for events on the node itself
   */
  containerId?: string;
}

export interface DragSelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  selectedElements: HTMLElement[];
  selectedIds: string[];
}

export function dragSelection(node: HTMLElement, config: DragSelectionConfig) {
  let state: DragSelectionState = {
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    selectedElements: [],
    selectedIds: []
  };

  let selectionRect: HTMLDivElement | null = null;
  let preDragSelectedElements: HTMLElement[] = [];
  let preDragSelectedIds: string[] = [];

  const {
    selectableSelector,
    onSelectionChange,
    onSelectionStart,
    onSelectionEnd,
    allowMultiSelect = true,
    showSelectionRect = true,
    selectionRectClass = "fixed pointer-events-none border border-aps1 bg-aps3 z-50 rounded-sm",
    getElementId = (el) => el.getAttribute("data-id") || "",
    preventTextSelection = true,
    containerId
  } = config;

  const containerElement = containerId
    ? document.getElementById(containerId) || node
    : node;

  function createSelectionRect() {
    if (!showSelectionRect) return;

    const baseElement = document.getElementById("base");
    if (!baseElement) return;
    selectionRect = document.createElement("div");
    selectionRect.className = selectionRectClass;
    selectionRect.style.opacity = "0.50";
    selectionRect.style.display = "none";
    selectionRect.style.position = "fixed";
    baseElement.appendChild(selectionRect);
  }

  function updateSelectionRect() {
    if (!selectionRect || !state.isSelecting) return;

    const left = Math.min(state.startX, state.currentX);
    const top = Math.min(state.startY, state.currentY);
    const width = Math.abs(state.currentX - state.startX);
    const height = Math.abs(state.currentY - state.startY);

    selectionRect.style.left = `${left}px`;
    selectionRect.style.top = `${top}px`;
    selectionRect.style.width = `${width}px`;
    selectionRect.style.height = `${height}px`;
    selectionRect.style.display = width > 2 || height > 2 ? "block" : "none";
  }

  function updateSelectedElements() {
    if (!state.isSelecting) return;

    const selectionLeft = Math.min(state.startX, state.currentX);
    const selectionTop = Math.min(state.startY, state.currentY);
    const selectionRight = Math.max(state.startX, state.currentX);
    const selectionBottom = Math.max(state.startY, state.currentY);

    const selectableElements = node.querySelectorAll(
      selectableSelector
    ) as NodeListOf<HTMLElement>;

    const newSelectedElements: HTMLElement[] = [...preDragSelectedElements];
    const newSelectedIds: string[] = [...preDragSelectedIds];

    selectableElements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      const intersects = !(
        rect.right < selectionLeft ||
        rect.left > selectionRight ||
        rect.bottom < selectionTop ||
        rect.top > selectionBottom
      );

      if (intersects) {
        const elementId = getElementId(element);
        const isAlreadySelected = newSelectedIds.includes(elementId);

        if (!isAlreadySelected) {
          newSelectedElements.push(element);
          newSelectedIds.push(elementId);
        }
      }
    });

    state.selectedElements = newSelectedElements;
    state.selectedIds = newSelectedIds;
    onSelectionChange?.(state.selectedElements, state.selectedIds);
  }

  function handleMouseDown(event: MouseEvent) {
    if (!event.target) return;

    const clickedElement = event.target as HTMLElement;
    if (clickedElement.closest(selectableSelector)) return;

    state.isSelecting = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.currentX = state.startX;
    state.currentY = state.startY;

    if (allowMultiSelect && (event.ctrlKey || event.metaKey)) {
      preDragSelectedElements = [...state.selectedElements];
      preDragSelectedIds = [...state.selectedIds];
    } else {
      preDragSelectedElements = [];
      preDragSelectedIds = [];
      state.selectedElements = [];
      state.selectedIds = [];
    }

    onSelectionStart?.();

    if (preventTextSelection) {
      event.preventDefault();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!state.isSelecting) return;

    state.currentX = event.clientX;
    state.currentY = event.clientY;

    updateSelectionRect();
    updateSelectedElements();

    if (preventTextSelection) {
      event.preventDefault();
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (!state.isSelecting) return;

    state.isSelecting = false;
    updateSelectedElements();

    if (selectionRect) {
      selectionRect.style.display = "none";
    }

    onSelectionEnd?.(state.selectedElements, state.selectedIds);

    if (preventTextSelection) {
      event.preventDefault();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && state.selectedElements.length > 0) {
      state.selectedElements = [];
      state.selectedIds = [];
      onSelectionChange?.(state.selectedElements, state.selectedIds);
    }
  }

  createSelectionRect();

  containerElement.addEventListener("mousedown", handleMouseDown);
  containerElement.addEventListener("mousemove", handleMouseMove);
  containerElement.addEventListener("mouseup", handleMouseUp);
  containerElement.addEventListener("keydown", handleKeyDown);

  return {
    update(newConfig: DragSelectionConfig) {
      Object.assign(config, newConfig);
    },

    destroy() {
      containerElement.removeEventListener("mousedown", handleMouseDown);
      containerElement.removeEventListener("mousemove", handleMouseMove);
      containerElement.removeEventListener("mouseup", handleMouseUp);
      containerElement.removeEventListener("keydown", handleKeyDown);

      if (selectionRect && selectionRect.parentNode) {
        selectionRect.parentNode.removeChild(selectionRect);
      }
    },

    clearSelection() {
      state.selectedElements = [];
      state.selectedIds = [];
      onSelectionChange?.(state.selectedElements, state.selectedIds);
    },

    getSelection() {
      return {
        elements: state.selectedElements,
        ids: state.selectedIds
      };
    }
  };
}

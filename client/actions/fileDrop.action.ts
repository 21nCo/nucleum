type FileDropError = { file: File; type: string };

type FileDropOptions = {
  disabled: boolean;
  accept: string;
  multiple: boolean;
  maxSize: number;
  onDrop: (all: File[], valid: File[], errors: FileDropError[]) => void;
  dragOverClass: string | string[];
  isPreventClickToBrowse: boolean;
};

/**
 * Use this action to enable file dropping on a node.
 *
 * use onDrop callback to handle the files
 *
 * @param node
 * @param options
 * @returns
 */
export function fileDrop(
  node: HTMLElement,
  options: Partial<FileDropOptions> = {}
) {
  let input: HTMLInputElement | undefined;
  const defaultOptions: FileDropOptions = {
    disabled: false,
    accept: "*",
    multiple: false,
    maxSize: Infinity, // in bytes
    onDrop: () => {},
    dragOverClass: ["border-fgs3"],
    isPreventClickToBrowse: false
  };
  let settings: FileDropOptions = { ...defaultOptions, ...options };

  function setupInput() {
    input = document.createElement("input");
    input.type = "file";
    input.accept = settings.accept;
    input.multiple = settings.multiple;
    input.style.display = "none";
    node.appendChild(input);
  }

  function handleFiles(files: FileList) {
    const errors: FileDropError[] = [];
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > settings.maxSize) {
        errors.push({ file, type: "size" });
        return false;
      }
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      const acceptedExtensions = settings.accept
        .split(",")
        .map((ext) => ext.trim().toLowerCase());
      if (
        acceptedExtensions[0] !== "*" &&
        !acceptedExtensions.includes(fileExtension)
      ) {
        errors.push({ file, type: "type" });
        return false;
      }
      return true;
    });

    settings.onDrop(Array.from(files), validFiles, errors);
    // if (validFiles.length > 0) {
    //   settings.onDrop(settings.multiple ? validFiles : validFiles[0]);
    // }
  }

  function addDragOverClasses() {
    if (Array.isArray(settings.dragOverClass)) {
      node.classList.add(...settings.dragOverClass);
    } else {
      node.classList.add(settings.dragOverClass);
    }
  }

  function removeDragOverClasses() {
    if (Array.isArray(settings.dragOverClass)) {
      node.classList.remove(...settings.dragOverClass);
    } else {
      node.classList.remove(settings.dragOverClass);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    addDragOverClasses();
  }

  function handleDragLeave() {
    removeDragOverClasses();
  }

  function handleDrop(event: DragEvent) {
    if (!event.dataTransfer) return;
    event.preventDefault();
    removeDragOverClasses();
    handleFiles(event.dataTransfer.files);
  }

  function handleClick() {
    if (settings.disabled || settings.isPreventClickToBrowse || !input) return;
    input.click();
  }

  function handleBrowse() {
    if (settings.disabled || !input) return;
    input.click();
  }

  function handleChange() {
    if (!input?.files) return;
    handleFiles(input.files);
    input.value = ""; // Reset input to allow selecting the same file again
  }

  setupInput();
  const currentInput = input;
  if (!currentInput) {
    return {
      update() {},
      destroy() {}
    };
  }

  node.addEventListener("dragover", handleDragOver);
  node.addEventListener("dragleave", handleDragLeave);
  node.addEventListener("drop", handleDrop);
  node.addEventListener("click", handleClick);
  node.addEventListener("browse", handleBrowse);
  currentInput.addEventListener("change", handleChange);

  return {
    update(newOptions: Partial<FileDropOptions>) {
      settings = { ...settings, ...newOptions };
      currentInput.accept = settings.accept;
      currentInput.multiple = settings.multiple;
    },
    destroy() {
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
      node.removeEventListener("click", handleClick);
      node.removeEventListener("browse", handleBrowse);
      currentInput.removeEventListener("change", handleChange);
      node.removeChild(currentInput);
    }
  };
}

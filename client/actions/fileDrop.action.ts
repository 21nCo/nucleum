/**
 * Use this action to enable file dropping on a node.
 *
 * use onDrop callback to handle the files
 *
 * @param node
 * @param options
 * @returns
 */
export function fileDrop(node: HTMLElement, options = {}) {
  let input: HTMLInputElement;
  const defaultOptions = {
    disabled: false,
    accept: "*",
    multiple: false,
    maxSize: Infinity, // in bytes
    onDrop: (
      all: File[],
      valid: File[],
      errors: { file: File; type: string }[]
    ) => {},
    dragOverClass: ["border-fgs3"]
  };
  let settings = { ...defaultOptions, ...options };

  function setupInput() {
    input = document.createElement("input");
    input.type = "file";
    input.accept = settings.accept;
    input.multiple = settings.multiple;
    input.style.display = "none";
    node.appendChild(input);
  }

  function handleFiles(files: FileList) {
    const errors: { file: File; type: string }[] = [];
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
    if (settings.disabled) return;
    input.click();
  }

  function handleChange() {
    if (!input.files) return;
    handleFiles(input.files);
    input.value = ""; // Reset input to allow selecting the same file again
  }

  setupInput();

  node.addEventListener("dragover", handleDragOver);
  node.addEventListener("dragleave", handleDragLeave);
  node.addEventListener("drop", handleDrop);
  node.addEventListener("click", handleClick);
  input.addEventListener("change", handleChange);

  return {
    update(newOptions) {
      settings = { ...settings, ...newOptions };
      input.accept = settings.accept;
      input.multiple = settings.multiple;
    },
    destroy() {
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
      node.removeEventListener("click", handleClick);
      input.removeEventListener("change", handleChange);
      node.removeChild(input);
    }
  };
}

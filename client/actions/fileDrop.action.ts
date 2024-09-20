export function fileDrop(node, options = {}) {
  let input;
  const defaultOptions = {
    accept: "*",
    multiple: false,
    maxSize: Infinity, // in bytes
    onDrop: () => {},
    onInvalid: () => {}
  };
  const settings = { ...defaultOptions, ...options };

  function setupInput() {
    input = document.createElement("input");
    input.type = "file";
    input.accept = settings.accept;
    input.multiple = settings.multiple;
    input.style.display = "none";
    node.appendChild(input);
  }

  function handleFiles(files) {
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > settings.maxSize) {
        settings.onInvalid(file, "size");
        return false;
      }
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      const acceptedExtensions = settings.accept
        .split(",")
        .map((ext) => ext.trim().toLowerCase());
      if (
        acceptedExtensions[0] !== "*" &&
        !acceptedExtensions.includes(fileExtension)
      ) {
        settings.onInvalid(file, "type");
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      settings.onDrop(settings.multiple ? validFiles : validFiles[0]);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    node.classList.add("dragover");
  }

  function handleDragLeave() {
    node.classList.remove("dragover");
  }

  function handleDrop(event) {
    event.preventDefault();
    node.classList.remove("dragover");
    handleFiles(event.dataTransfer.files);
  }

  function handleClick() {
    input.click();
  }

  function handleChange() {
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

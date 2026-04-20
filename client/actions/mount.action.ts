export function mount(
  node: HTMLElement,
  callback?: ((node: HTMLElement) => void) | undefined
) {
  queueMicrotask(() => {
    if (typeof callback === "function") {
      callback(node);
    }
  });

  return {
    destroy() {}
  };
}

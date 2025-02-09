export function mount(
  node: HTMLElement,
  callback: (node: HTMLElement) => void
) {
  queueMicrotask(() => {
    callback(node);
  });

  return {
    destroy() {}
  };
}

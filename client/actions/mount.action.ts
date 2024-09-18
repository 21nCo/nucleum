export function mount(
  node: HTMLElement,
  callback: (node: HTMLElement) => void
) {
  callback(node);
  return {
    destroy() {}
  };
}

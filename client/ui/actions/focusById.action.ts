export function focusById(node: HTMLElement, targetId: string) {
  function handleClick(event: MouseEvent) {
    const targetElement = document.getElementById(targetId);
    if (targetElement && document.activeElement !== targetElement) {
      targetElement.focus();
    }
  }

  node.addEventListener("click", handleClick);

  return {
    destroy() {
      node.removeEventListener("click", handleClick);
    },
    update(newTargetId: string) {
      targetId = newTargetId;
    }
  };
}

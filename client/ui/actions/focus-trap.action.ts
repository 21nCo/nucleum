const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function focusableElements(node: HTMLElement) {
  return [...node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.closest("[inert], [hidden]")
  );
}

/**
 * Keeps keyboard focus inside `node` while it is mounted: moves focus into it
 * when it opens, wraps Tab and Shift+Tab at its ends unless a control inside
 * already handled the key, and returns focus to the element that was focused
 * before it when it is removed.
 */
export function focusTrap(node: HTMLElement) {
  const opener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const elements = focusableElements(node);
    const active = document.activeElement;
    if (elements.length === 0) {
      event.preventDefault();
      node.focus();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && (active === first || active === node)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!node.contains(document.activeElement)) node.focus();
  node.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      node.removeEventListener("keydown", handleKeydown);
      queueMicrotask(() => {
        const active = document.activeElement;
        const isFocusElsewhere =
          active instanceof HTMLElement &&
          active !== document.body &&
          active !== opener &&
          !node.contains(active);
        if (opener?.isConnected && !isFocusElsewhere) opener.focus();
      });
    }
  };
}

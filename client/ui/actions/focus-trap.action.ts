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
    (element) => element.tabIndex >= 0 && !element.closest("[inert], [hidden]")
  );
}

/**
 * Keeps keyboard focus inside `node` while it is mounted: moves focus into it
 * when it opens, wraps Tab and Shift+Tab at its ends unless a control inside
 * already handled the key, and returns focus to the element that was focused
 * before it when it is removed, or to `options.opener` when given. `release`
 * ends the trap without moving focus, for a node that stays mounted after it
 * no longer needs trapping; `opener` lets a later trap on the same node
 * return focus where the first one would. `include` adds containers outside
 * `node` that it owns, such as its popover containers: their controls join
 * the Tab cycle after those of `node`, and Tab inside them is trapped too.
 */
export function focusTrap(
  node: HTMLElement,
  options: { opener?: HTMLElement; include?: HTMLElement[] } = {}
) {
  const containers = [node, ...(options.include ?? [])];
  const opener =
    options.opener ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const elements = containers.flatMap(focusableElements);
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
    } else if (containers.length > 1) {
      const index = elements.indexOf(active as HTMLElement);
      const next = elements[index + (event.shiftKey ? -1 : 1)];
      if (index < 0 || !next) return;
      event.preventDefault();
      next.focus();
    }
  }

  if (!node.contains(document.activeElement)) node.focus();
  for (const container of containers)
    container.addEventListener("keydown", handleKeydown);

  return {
    opener,
    release() {
      for (const container of containers)
        container.removeEventListener("keydown", handleKeydown);
    },
    destroy() {
      for (const container of containers)
        container.removeEventListener("keydown", handleKeydown);
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

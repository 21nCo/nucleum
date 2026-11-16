import modalEvent from "@nucleum/shell/overlays/modal.store";

/** State of a dropdown anchored in the top bar. */
export type TopBarDropdownParams = {
  isOpen: boolean;
  onDismiss: () => void;
  /**
   * Also stops the Escape that closes the dropdown from propagating past the
   * window capture phase, so bubbling listeners such as an open modal's close
   * never see it. Other capture listeners on window still run.
   */
  isEscapeContained?: boolean;
};

/**
 * Dismisses the top bar dropdown inside `node`: on a pointer or key outside
 * it, on Escape, which it consumes in the capture phase so the layer below
 * stays open, and when a modal opens above it.
 */
export function topBarDropdown(
  node: HTMLElement,
  params: TopBarDropdownParams
) {
  let current = params;
  const isInside = (target: EventTarget | null) =>
    target instanceof Node && node.contains(target);
  const onPointerDown = (event: PointerEvent) => {
    if (current.isOpen && !isInside(event.target)) current.onDismiss();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!current.isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (current.isEscapeContained) event.stopPropagation();
      current.onDismiss();
      return;
    }
    if (!isInside(event.target)) current.onDismiss();
  };
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("keydown", onKeyDown, true);
  const unsubscribeModal = modalEvent.subscribe((modal) => {
    if (modal?.isShow && current.isOpen) current.onDismiss();
  });
  return {
    update(next: TopBarDropdownParams) {
      current = next;
    },
    destroy() {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      unsubscribeModal();
    }
  };
}

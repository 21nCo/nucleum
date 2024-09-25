import type { Action } from "svelte/action";

interface RearrangeParams {
  onRearrange: (displacement: number) => void;
  onRearranged: (displacement: number) => void;
  threshold?: number;
  enabled: boolean;
}

export const rearrange: Action<HTMLElement, RearrangeParams> = (
  node,
  params
) => {
  let isDragging = false;
  let startX: number | null = null;
  let lastMouseX: number | null = null;
  let translateX = 0;
  let prevTranslateX = 0;
  let rafId: number | null = null;
  let isFloatingToDestinationMode = false;
  let displacement = 0;
  let offsetX = 0;
  let prevMoveDirection: "forward" | "backward" | null = null;
  let moveDirection: "forward" | "backward" | null = null;

  const threshold = params.threshold || 30;
  const moveThreshold = 5;

  function hidePopovers() {
    const popovers = node.querySelectorAll(".popover");
    popovers.forEach((popover) => {
      (popover as HTMLElement).style.visibility = "hidden";
    });
  }

  function showPopovers() {
    const popovers = node.querySelectorAll(".popover");
    popovers.forEach((popover) => {
      (popover as HTMLElement).style.visibility = "visible";
    });
  }

  function onMouseDown(e: MouseEvent) {
    if (!params.enabled) return;
    startX = e.clientX;
    lastMouseX = startX;
    const left = node.getBoundingClientRect().left;
    offsetX = e.clientX - left;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(event: MouseEvent) {
    if (!params.enabled) return;
    lastMouseX = event.clientX;
    if (!isDragging && Math.abs(lastMouseX - (startX ?? 0)) > moveThreshold) {
      isDragging = true;
      isFloatingToDestinationMode = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
      hidePopovers();
    }
  }

  function handleMouseUp() {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    if (isDragging) {
      params.onRearranged(displacement);
      isFloatingToDestinationMode = false;
      translateX = 0;
      if (rafId) cancelAnimationFrame(rafId);
      node.style.transform = "";
      showPopovers();
    }

    isDragging = false;
  }

  function updatePosition() {
    if (isDragging && startX !== null && lastMouseX !== null) {
      translateX = lastMouseX - startX;

      if (!isFloatingToDestinationMode) {
        displacement = translateX;
      }
      if (Math.abs(displacement) > threshold && !isFloatingToDestinationMode) {
        params.onRearrange(displacement);
        isFloatingToDestinationMode = true;
        setTimeout(() => {
          const left = node.getBoundingClientRect().left;
          startX = left + offsetX;
          prevTranslateX = lastMouseX - startX;
        }, 1);
      }
      if (prevTranslateX < translateX) {
        moveDirection = "forward";
      } else if (prevTranslateX > translateX) {
        moveDirection = "backward";
      }
      if (
        prevTranslateX * translateX < 0 ||
        prevMoveDirection !== moveDirection
      ) {
        isFloatingToDestinationMode = false;
      }
      prevTranslateX = translateX;
      prevMoveDirection = moveDirection;
      node.style.transform = `translateX(${translateX}px)`;
      rafId = requestAnimationFrame(updatePosition);
    }
  }

  node.addEventListener("mousedown", onMouseDown);

  return {
    destroy() {
      node.removeEventListener("mousedown", onMouseDown);
    },
    update(newParams: RearrangeParams) {
      params = newParams;
    }
  };
};

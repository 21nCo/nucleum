interface LongPressParams {
  callback: () => void;
  duration?: number;
  isDisabled?: boolean;
}

interface SwipeParams {
  callback: () => void;
  threshold?: number;
  isDisabled?: boolean;
}

export function longpress(node: HTMLElement, params: LongPressParams) {
  const duration = params.duration || 500; // Default 500ms
  let timerId: any;
  let touchStartTime: number;

  function handleTouchStart(event: TouchEvent) {
    if (params.isDisabled) return;
    touchStartTime = Date.now();
    timerId = setTimeout(() => {
      params.callback();
    }, duration);
  }

  function handleTouchEnd(event: TouchEvent) {
    if (params.isDisabled) return;
    clearTimeout(timerId);
  }

  function handleTouchMove(event: TouchEvent) {
    if (params.isDisabled) return;
    clearTimeout(timerId);
  }

  node.addEventListener("touchstart", handleTouchStart);
  node.addEventListener("touchend", handleTouchEnd);
  node.addEventListener("touchmove", handleTouchMove);

  return {
    destroy() {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchmove", handleTouchMove);
    },
    update(newParams: LongPressParams) {
      params = newParams;
    }
  };
}

export function swipe(
  node: HTMLElement,
  params: SwipeParams & { direction: "left" | "right" }
) {
  const threshold = params.threshold || 50; // Default 50px
  let touchStartX: number | null = null;
  let touchStartY: number | null = null;

  function handleTouchStart(event: TouchEvent) {
    if (params.isDisabled) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (params.isDisabled) return;
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = Math.abs(touchEndY - touchStartY);

    // Only trigger if horizontal movement is greater than vertical movement
    // and exceeds threshold
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (params.direction === "left" && deltaX < 0) {
        params.callback();
      } else if (params.direction === "right" && deltaX > 0) {
        params.callback();
      }
    }

    touchStartX = null;
    touchStartY = null;
  }

  node.addEventListener("touchstart", handleTouchStart);
  node.addEventListener("touchend", handleTouchEnd);

  return {
    destroy() {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchend", handleTouchEnd);
    },
    update(newParams: SwipeParams & { direction: "left" | "right" }) {
      params = newParams;
    }
  };
}

// Convenience exports for left and right swipe
export function leftswipe(node: HTMLElement, params: SwipeParams) {
  return swipe(node, { ...params, direction: "left" });
}

export function rightswipe(node: HTMLElement, params: SwipeParams) {
  return swipe(node, { ...params, direction: "right" });
}

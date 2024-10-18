import { tick } from "svelte";

function isElementInViewportv1(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function scrollIntoViewOnFocusv1(node: HTMLElement, options: any) {
  const scrollOptions = {
    behavior: options.behavior || "smooth",
    block: options.block || "nearest",
    inline: options.inline || "nearest"
  };

  async function handleFocus() {
    await tick();
    if (!isElementInViewportv1(node)) {
      node.scrollIntoView(scrollOptions);
    }
  }

  node.addEventListener("focus", handleFocus);

  return {
    update(newOptions: any) {
      Object.assign(scrollOptions, newOptions);
    },
    destroy() {
      node.removeEventListener("focus", handleFocus);
    }
  };
}

function getScrollParent(element: HTMLElement): HTMLElement | null {
  if (!element) return null;
  const hasVerticalScroll = element.scrollHeight > element.clientHeight;
  const hasHorizontalScroll = element.scrollWidth > element.clientWidth;
  if (hasVerticalScroll || hasHorizontalScroll) {
    const style = window.getComputedStyle(element);
    const overflowRegex = /(auto|scroll)/;

    if (
      overflowRegex.test(style.overflow) ||
      overflowRegex.test(style.overflowY) ||
      overflowRegex.test(style.overflowX)
    ) {
      return element;
    }
  }
  return getScrollParent(element.parentElement as HTMLElement);
}

function isElementInView(
  element: HTMLElement,
  container: HTMLElement
): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    elementRect.top >= containerRect.top &&
    elementRect.left >= containerRect.left &&
    elementRect.bottom <= containerRect.bottom &&
    elementRect.right <= containerRect.right
  );
}

function isElementInViewEager(
  element: HTMLElement,
  container: HTMLElement,
  eagerDistance: number | EagerOptions = 0
): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const eager =
    typeof eagerDistance === "number"
      ? {
          top: eagerDistance,
          bottom: eagerDistance,
          left: eagerDistance,
          right: eagerDistance
        }
      : {
          top: eagerDistance.top || 0,
          bottom: eagerDistance.bottom || 0,
          left: eagerDistance.left || 0,
          right: eagerDistance.right || 0
        };

  return (
    elementRect.top >= containerRect.top + eager.top &&
    elementRect.left >= containerRect.left + eager.left &&
    elementRect.bottom <= containerRect.bottom - eager.bottom &&
    elementRect.right <= containerRect.right - eager.right
  );
}

function scrollElementIntoViewv1(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollIntoViewOptions
) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (elementRect.top < containerRect.top) {
    container.scrollBy({
      top: elementRect.top - containerRect.top,
      behavior: options.behavior
    });
  } else if (elementRect.bottom > containerRect.bottom) {
    container.scrollBy({
      top: elementRect.bottom - containerRect.bottom,
      behavior: options.behavior
    });
  }

  if (elementRect.left < containerRect.left) {
    container.scrollBy({
      left: elementRect.left - containerRect.left,
      behavior: options.behavior
    });
  } else if (elementRect.right > containerRect.right) {
    container.scrollBy({
      left: elementRect.right - containerRect.right,
      behavior: options.behavior
    });
  }
}

function scrollElementIntoView(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollIntoViewOptions
) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const relativeTop = elementRect.top - containerRect.top;
  const relativeLeft = elementRect.left - containerRect.left;

  if (options.block === "center") {
    const containerVisibleHeight = container.clientHeight;
    const elementHeight = elementRect.height;
    const centerPosition =
      relativeTop - containerVisibleHeight / 2 + elementHeight / 2;

    container.scrollBy({
      top: centerPosition,
      behavior: options.behavior
    });
  } else if (options.block === "start") {
    container.scrollBy({
      top: relativeTop,
      behavior: options.behavior
    });
  } else if (options.block === "end") {
    container.scrollBy({
      top: relativeTop - container.clientHeight + elementRect.height,
      behavior: options.behavior
    });
  } else {
    if (elementRect.top < containerRect.top) {
      container.scrollBy({
        top: relativeTop,
        behavior: options.behavior
      });
    } else if (elementRect.bottom > containerRect.bottom) {
      container.scrollBy({
        top: relativeTop - container.clientHeight + elementRect.height,
        behavior: options.behavior
      });
    }
  }

  if (options.inline === "center") {
    const containerVisibleWidth = container.clientWidth;
    const elementWidth = elementRect.width;
    const centerPosition =
      relativeLeft - containerVisibleWidth / 2 + elementWidth / 2;

    container.scrollBy({
      left: centerPosition,
      behavior: options.behavior
    });
  } else if (options.inline === "start") {
    container.scrollBy({
      left: relativeLeft,
      behavior: options.behavior
    });
  } else if (options.inline === "end") {
    container.scrollBy({
      left: relativeLeft - container.clientWidth + elementRect.width,
      behavior: options.behavior
    });
  } else {
    if (elementRect.left < containerRect.left) {
      container.scrollBy({
        left: relativeLeft,
        behavior: options.behavior
      });
    } else if (elementRect.right > containerRect.right) {
      container.scrollBy({
        left: relativeLeft - container.clientWidth + elementRect.width,
        behavior: options.behavior
      });
    }
  }
}

interface EagerOptions {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface ExtendedScrollOptions extends ScrollIntoViewOptions {
  eager?: number | EagerOptions;
}

export function scrollIntoViewOnFocus(
  node: HTMLElement,
  options: ExtendedScrollOptions = {}
) {
  const scrollOptions = {
    behavior: options.behavior || "smooth",
    block: options.block || "nearest",
    inline: options.inline || "nearest",
    eager: options.eager || undefined
  };

  async function handleFocus() {
    await tick();
    const scrollParent = getScrollParent(node.parentElement);

    if (scrollParent) {
      if (!isElementInViewEager(node, scrollParent, scrollOptions.eager)) {
        scrollElementIntoView(node, scrollParent, scrollOptions);
      }
    } else {
      if (!isElementInViewportEager(node, scrollOptions.eager)) {
        node.scrollIntoView(scrollOptions);
      }
    }
  }

  node.addEventListener("focus", handleFocus);

  return {
    update(newOptions: ScrollIntoViewOptions) {
      Object.assign(scrollOptions, newOptions);
    },
    destroy() {
      node.removeEventListener("focus", handleFocus);
    }
  };
}

function isElementInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function isElementInViewportEager(
  el: HTMLElement,
  eagerDistance: number | EagerOptions = 0
) {
  const rect = el.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const eager =
    typeof eagerDistance === "number"
      ? {
          top: eagerDistance,
          bottom: eagerDistance,
          left: eagerDistance,
          right: eagerDistance
        }
      : {
          top: eagerDistance.top || 0,
          bottom: eagerDistance.bottom || 0,
          left: eagerDistance.left || 0,
          right: eagerDistance.right || 0
        };

  return (
    rect.top >= 0 + eager.top &&
    rect.left >= 0 + eager.left &&
    rect.bottom <= windowHeight - eager.bottom &&
    rect.right <= windowWidth - eager.right
  );
}

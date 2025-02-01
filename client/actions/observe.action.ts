type AttributeCallback = (
  attributeName: string,
  value: string | null,
  oldValue: string | null
) => void;

interface ObserveAttributesParams {
  attributes: string[];
  callback: AttributeCallback;
}

export function observeAttributes(
  node: HTMLElement,
  params: ObserveAttributesParams
) {
  let { attributes, callback } = params;

  const dataAttributes = attributes.map((attr) => `data-${attr}`);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName &&
        dataAttributes.includes(mutation.attributeName)
      ) {
        const value = node.getAttribute(mutation.attributeName);
        const attributeName = mutation.attributeName.replace("data-", "");
        callback(attributeName, value, mutation.oldValue);
      }
    });
  });
  observer.observe(node, {
    attributes: true,
    attributeFilter: dataAttributes,
    attributeOldValue: true
  });

  return {
    destroy() {
      observer.disconnect();
    },

    update(newParams: ObserveAttributesParams) {
      const { attributes: newAttributes, callback: newCallback } = newParams;

      const newDataAttributes = newAttributes.map((attr) => `data-${attr}`);

      observer.disconnect();
      observer.observe(node, {
        attributes: true,
        attributeFilter: newDataAttributes,
        attributeOldValue: true
      });

      callback = newCallback;
    }
  };
}

interface TrackPositionParams {
  callback: (position: { x: number; y: number }) => void;
}

/**
 * Tracks the position of an element in the viewport.
 * @param node The HTML element to track
 * @param params Configuration parameters including the callback function
 */
export function trackPosition(node: HTMLElement, params: TrackPositionParams) {
  let frame: number;
  let lastX = 0;
  let lastY = 0;
  let { callback } = params;

  function update() {
    const rect = node.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY;

    if (x !== lastX || y !== lastY) {
      lastX = x;
      lastY = y;
      callback({ x, y });
    }

    frame = requestAnimationFrame(update);
  }

  update();

  return {
    destroy() {
      cancelAnimationFrame(frame);
    },

    update(newParams: TrackPositionParams) {
      callback = newParams.callback;
    }
  };
}

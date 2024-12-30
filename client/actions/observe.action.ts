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

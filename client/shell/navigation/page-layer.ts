/** Attribute that marks each element rendering a resource page opened over the base page. */
export const PAGE_LAYER_ATTRIBUTE = "data-page-layer";

/** Attributes spread onto an element to mark it as an opened resource page layer. */
export const pageLayerAttributes = { [PAGE_LAYER_ATTRIBUTE]: "" };

/**
 * The element rendering the topmost opened resource page, if any. Content
 * shown beneath it, such as the same resource in the base page, is left out.
 */
export function resolvePageLayer(root: ParentNode = document) {
  const layers = root.querySelectorAll(`[${PAGE_LAYER_ATTRIBUTE}]`);
  return layers.length > 0 ? layers[layers.length - 1] : undefined;
}

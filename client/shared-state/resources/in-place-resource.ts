import { getContext, setContext } from "svelte";

const IN_PLACE_CONTEXT_KEY = Symbol("in-place-resource");

/** How a resource shown in place inside another page can be closed. */
export type InPlaceResourceOptions = {
  /** Closes the resource within its host page, such as deselecting it. */
  onClose?: () => void;
};

/**
 * Marks resources rendered below this component as shown in place inside
 * another page, such as an item inside a space. They close only through
 * `onClose` when the host page provides one.
 */
export function setInPlaceResource(options: InPlaceResourceOptions = {}) {
  setContext(IN_PLACE_CONTEXT_KEY, options);
}

/** Whether the resource renders in place inside another page. */
export function isInPlaceResource() {
  return (
    getContext<InPlaceResourceOptions | undefined>(IN_PLACE_CONTEXT_KEY) !==
    undefined
  );
}

/** Close handler of the host page around an in-place resource, if any. */
export function resolveInPlaceResourceClose() {
  return getContext<InPlaceResourceOptions | undefined>(IN_PLACE_CONTEXT_KEY)
    ?.onClose;
}

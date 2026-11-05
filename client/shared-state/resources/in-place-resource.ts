import { getContext, setContext } from "svelte";

const IN_PLACE_CONTEXT_KEY = Symbol("in-place-resource");

/**
 * Marks resources rendered below this component as shown in place inside
 * another page, such as an item inside a space, where they cannot be closed
 * on their own.
 */
export function setInPlaceResource() {
  setContext(IN_PLACE_CONTEXT_KEY, true);
}

/** Whether the resource renders in place inside another page. */
export function isInPlaceResource() {
  return getContext<boolean | undefined>(IN_PLACE_CONTEXT_KEY) ?? false;
}

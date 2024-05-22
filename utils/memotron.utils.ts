import { toggleSearchParam } from "$lib/tidy/utils/browser.utils";

export function resourceClickHandler(
  x: CustomEvent<{ id: string; event: MouseEvent }>
) {
  const { id, event } = x.detail;
  if (event.shiftKey) {
    //   TODO - open in focus mode
  } else if (event.altKey) {
    if (!id) return;
    toggleSearchParam("split", id);
  } else if (event.metaKey) {
    // - open in new tab
  } else {
    toggleSearchParam("main", id);
  }
}

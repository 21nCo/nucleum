import { get } from "svelte/store";
import { analyticsConfigStore, selectedPageId } from "./analytics.store";

/** Handles analytics page editing. */
export function onAddPageClicked() {
  analyticsConfigStore.addPage();
}

/** Handles analytics page editing. */
export function onRemovePageClicked(e: CustomEvent<string>) {
  const id = e.detail;
  if (id == get(selectedPageId)) {
    const pages = get(analyticsConfigStore).pages;
    const index = pages.findIndex((page) => page.id !== id);
    if (index !== -1) {
      selectedPageId.set(
        get(analyticsConfigStore).pages.find(
          (page) => page.id === pages[index]?.id
        )?.id as string
      );
    } else selectedPageId.set(undefined);
  }
  analyticsConfigStore.removePage(e.detail);
}

/** Handles analytics page editing. */
export function onPagelabelChange(
  e: CustomEvent<{ value: string; label: string }>
) {
  if (!e.detail.label || !e.detail.value) return;
  analyticsConfigStore.editPageLabel(e.detail.value, e.detail.label);
}

/** Handles analytics page editing. */
export function onPageRearrange(e: CustomEvent) {
  const ids = e.detail;
  if (!Array.isArray(ids)) return;
  analyticsConfigStore.rearrangePages(ids);
}

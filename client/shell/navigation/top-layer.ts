import { get } from "svelte/store";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
import { navigation } from "@nucleum/shell/navigation/navigation";

/** Layers the shell can close, from the top of the stack down. */
export type TopLayer =
  "overlay" | "panel" | "bulk" | "beside-page" | "page" | "beside-base";

/**
 * Resolves the topmost closable layer: overlay, then right panel, then bulk
 * selection, then the resource page layer and its split, then the split next
 * to the base page.
 */
export function resolveTopLayer(
  searchParams: URLSearchParams,
  bulkCount: number,
  options?: { isIncludePanel?: boolean }
): TopLayer | undefined {
  if (searchParams.get(AccessMode.OVERLAY)) return "overlay";
  if (options?.isIncludePanel !== false && searchParams.get(AccessMode.PANEL))
    return "panel";
  if (bulkCount > 0) return "bulk";
  if (searchParams.get(AccessMode.BESIDE_PAGE)) return "beside-page";
  if (searchParams.get(AccessMode.PAGE)) return "page";
  if (searchParams.get(AccessMode.BESIDE_BASE)) return "beside-base";
  return undefined;
}

const layerParams: Partial<Record<TopLayer, AccessMode>> = {
  overlay: AccessMode.OVERLAY,
  panel: AccessMode.PANEL,
  "beside-page": AccessMode.BESIDE_PAGE,
  page: AccessMode.PAGE,
  "beside-base": AccessMode.BESIDE_BASE
};

/**
 * Closes the topmost layer. The top bar close button skips the right panel,
 * which has its own toggle; Esc includes it. Returns the closed layer.
 */
export function closeTopLayer(options?: {
  isIncludePanel?: boolean;
  /** Selection size observed when the triggering key was first seen. */
  bulkCount?: number;
}): TopLayer | undefined {
  const searchParams = new URLSearchParams(window.location.search);
  const layer = resolveTopLayer(
    searchParams,
    options?.bulkCount ?? get(bulkEditStore.count),
    options
  );
  if (!layer) return undefined;
  if (layer === "bulk") {
    bulkEditStore.reset();
    return layer;
  }
  const param = layerParams[layer];
  if (!param) return undefined;
  if (layer === "overlay" || layer === "panel") {
    navigation.toggleSearchParam([param]);
  } else {
    navigation.closeResource({ accessMode: param });
  }
  return layer;
}

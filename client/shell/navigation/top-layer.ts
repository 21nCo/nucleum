import { get } from "svelte/store";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
import { fullScreen } from "@nucleum/shell/overlays/modal.store";
import { isOverlayAbovePage } from "@nucleum/shell/navigator/navigator-layer";

/** Layers the shell can close, from the top of the stack down. */
export type TopLayer =
  | "overlay"
  | "panel"
  | "bulk"
  | "beside-page"
  | "full-screen"
  | "page"
  | "beside-base";

/**
 * Resolves the topmost closable layer: overlay, then right panel, then bulk
 * selection, then the split beside the resource page, then full screen, then
 * the resource page, then the split next to the base page. A resource page
 * opened from an overlay covers it, so that overlay comes after the page,
 * except an overlay drawn above the page, such as the navigator.
 */
export function resolveTopLayer(
  searchParams: URLSearchParams,
  bulkCount: number,
  options?: { isIncludePanel?: boolean; isIncludeFullScreen?: boolean }
): TopLayer | undefined {
  const isPageOpen = !!searchParams.get(AccessMode.PAGE);
  const overlay = searchParams.get(AccessMode.OVERLAY);
  const isOverlayOpen = !!overlay;
  if (isOverlayOpen && (!isPageOpen || isOverlayAbovePage(overlay)))
    return "overlay";
  if (options?.isIncludePanel !== false && searchParams.get(AccessMode.PANEL))
    return "panel";
  if (bulkCount > 0) return "bulk";
  if (searchParams.get(AccessMode.BESIDE_PAGE)) return "beside-page";
  if (
    options?.isIncludeFullScreen !== false &&
    isPageOpen &&
    searchParams.get(AppSearchParam.MAX)
  )
    return "full-screen";
  if (isPageOpen) return "page";
  if (isOverlayOpen) return "overlay";
  if (searchParams.get(AccessMode.BESIDE_BASE)) return "beside-base";
  return undefined;
}

/**
 * Accessible name of the top bar close control, which skips the right panel
 * and full screen: "Clear selection" while a bulk selection is the layer it
 * closes, otherwise "Close".
 */
export function resolveCloseControlLabel(
  searchParams: URLSearchParams,
  bulkCount: number
) {
  return resolveTopLayer(searchParams, bulkCount, {
    isIncludePanel: false,
    isIncludeFullScreen: false
  }) === "bulk"
    ? "Clear selection"
    : "Close";
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
 * which has its own toggle, and closes a full screen page instead of only
 * leaving full screen; Esc includes both. Returns the closed layer.
 */
export function closeTopLayer(options?: {
  isIncludePanel?: boolean;
  isIncludeFullScreen?: boolean;
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
  if (layer === "full-screen") {
    navigation.exitFullScreen();
    return layer;
  }
  if (layer === "overlay") {
    const fullScreenPath = fullScreen.get().path;
    const isMax = !!searchParams.get(AppSearchParam.MAX);
    if (
      fullScreenPath &&
      (isMax || fullScreenPath === searchParams.get(AccessMode.OVERLAY))
    ) {
      fullScreen.hide();
      return layer;
    }
    if (isMax) {
      navigation.toggleSearchParam([AccessMode.OVERLAY, AppSearchParam.MAX]);
      return layer;
    }
  }
  const param = layerParams[layer];
  if (!param) return undefined;
  if (layer === "overlay" || layer === "panel") {
    navigation.toggleSearchParam([param]);
  } else {
    navigation.closeResource({ accessMode: param, isHistoryBack: true });
  }
  return layer;
}

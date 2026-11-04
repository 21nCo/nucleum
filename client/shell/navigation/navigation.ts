import { isRecordId } from "@nucleum/datafn/resource.utils";
import { get, type Readable } from "svelte/store";

import {
  AppSearchParam,
  type IAppStore
} from "@nucleum/shared-state/app-context/app-store.type";

import { Resource } from "@nucleum/datafn/resource.enum";

import { goto } from "@nucleum/client/runtime/navigation/navigation-request";

import { postDataToParent } from "@nucleum/client/runtime/embed/embed.utils";

import view from "@21n/ui/environment/view.store";
import context from "@nucleum/client/runtime/context.store";
import { appEvents } from "@nucleum/shared-state/events/app-events.store";

import { AccessMode } from "@nucleum/datafn/resource.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";

import { Action } from "@nucleum/client/config/action.enum";
import { SPACE_FOCUS_PARAM } from "@nucleum/client/config/space-route";

import { logger } from "@nucleum/client/runtime/logging/logger";

import type { IRecordId } from "@nucleum/schema/legacy/data.type";

import { determineResourceAccessMode } from "@nucleum/datafn/resource.utils";

import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { resolveNavigationLinkTarget } from "@nucleum/shell/navigation/link-target";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { isCommandModeLayout } from "@nucleum/shell/navigation/command-mode-layout";
import { navigatorHistory } from "@nucleum/shell/navigator/navigator-history.store";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
import {
  isSameAccessTrailPosition,
  resolveAccessTrailParent,
  type AccessTrailPosition
} from "@nucleum/shell/navigator/access-trail";
import { forgetPageScroll } from "@nucleum/shell/navigation/page-scroll";
import { resolveNavigatorLayer } from "@nucleum/shell/navigator/navigator-layer";
import { fullScreen } from "@nucleum/shell/overlays/modal.store";

/**
 * How a page open changes the access trail: start a new trail, extend the
 * current one from its active resource, or follow a node the trail already
 * selected (`select` adds a history entry, `back` replaces the current one).
 */
export type AccessTrailIntent = "start" | "extend" | "select" | "back";

const recordedAccessModes = new Set<AccessMode | undefined>([
  AccessMode.PAGE,
  AccessMode.BESIDE_BASE,
  AccessMode.BESIDE_PAGE
]);

/**
 * Records a navigated resource with the record it was opened from. Without an
 * explicit origin the record open as the page counts as the origin; an origin that
 * is an action or access point records no origin.
 */
function recordResourceOpen(
  id: IRecordId,
  origin: Action | IRecordId | undefined
) {
  const resolvedOrigin =
    origin === undefined
      ? (new URL(window.location.href).searchParams.get(AccessMode.PAGE) ??
        undefined)
      : origin;
  navigatorHistory.recordResource(
    id.toString(),
    resolvedOrigin && isRecordId(resolvedOrigin)
      ? resolvedOrigin.toString()
      : undefined
  );
}

const recordSpecificSearchParams = [
  /-type$/,
  /-tab$/,
  /-task$/,
  /-nodeView$/,
  /-panel$/,
  AppSearchParam.EDIT,
  AppSearchParam.VIEW,
  AppSearchParam.BESIDE_PAGE_AT,
  AppSearchParam.LINK,
  AppSearchParam.DATE,
  AppSearchParam.SETTING,
  AccessMode.BESIDE_PAGE
];

const layerScopedRecordParams = [SPACE_FOCUS_PARAM];

const closableLayerModes = [
  AccessMode.BESIDE_BASE,
  AccessMode.PAGE,
  AccessMode.BESIDE_PAGE,
  AccessMode.OVERLAY
];

/** Whether a layer that closing every opened resource would close is open. */
export function hasClosableLayer(searchParams: URLSearchParams) {
  return closableLayerModes.some((mode) => searchParams.get(mode));
}

/**
 * Removes record-specific state, such as a space's focused sub space, only for the records that
 * leave the view, so a record that stays open beneath an overlay keeps it. The record being opened
 * is cleared too, so opening a space always starts at its root.
 */
function clearLayerScopedRecordParams(
  url: URL,
  ids: (IRecordId | null | undefined)[]
) {
  for (const id of ids) {
    if (!id) continue;
    for (const param of layerScopedRecordParams)
      url.searchParams.delete(
        navigation.resolveRecordSpecificSearchParam(id, param)
      );
  }
}

/**
 * Removes the record-specific state of the records an open in `mode` replaces,
 * as opening `id` there would, and returns the cleaned URL.
 */
function clearOpenedRecordParams(url: URL, id: IRecordId, mode: string) {
  clearLayerScopedRecordParams(url, [
    id,
    url.searchParams.get(mode),
    url.searchParams.get(AccessMode.BESIDE_PAGE)
  ]);
  return (
    navigation.toggleSearchParam(recordSpecificSearchParams, {
      isPreventRefresh: true,
      url
    }) ?? url
  );
}

/**
 * Access-trail state kept in a resource page's browser history entry: the
 * trail node the entry shows, and the node of the entry it was pushed from,
 * which is null when it was pushed from the base page.
 */
export type AccessTrailHistoryState = {
  position: AccessTrailPosition;
  from?: AccessTrailPosition | null;
};

const ACCESS_TRAIL_STATE_KEY = "accessTrail";

/** Reads the access-trail state of a history entry, if it has one. */
export function readAccessTrailHistoryState(
  state: unknown
): AccessTrailHistoryState | undefined {
  const value =
    state && typeof state === "object"
      ? (state as Record<string, unknown>)[ACCESS_TRAIL_STATE_KEY]
      : undefined;
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<AccessTrailHistoryState>;
  if (
    typeof entry.position?.trail !== "string" ||
    typeof entry.position?.node !== "string"
  ) {
    return undefined;
  }
  return entry as AccessTrailHistoryState;
}

let currentEntry:
  { pageId: string; state?: AccessTrailHistoryState } | undefined;

/**
 * Whether the overlay in `searchParams` is the one shown in full screen. A
 * page opened over it inherits its `max`, which stays with the overlay.
 */
function isFullScreenOverlayOpen(searchParams: URLSearchParams) {
  const overlay = searchParams.get(AccessMode.OVERLAY);
  return !!overlay && overlay === fullScreen.get().path;
}

/** Whether `id` is the open page and that page is in full screen. */
export function isFullScreenPage(
  id: IRecordId | undefined,
  searchParams: URLSearchParams = new URLSearchParams(window.location.search)
) {
  return (
    !!id &&
    !!searchParams.get(AppSearchParam.MAX) &&
    searchParams.get(AccessMode.PAGE) === id.toString()
  );
}

/** Resolves whether a page open starts a trail or extends the current one. */
function resolveAccessTrailIntent(
  openPage: string | null,
  origin: Action | IRecordId | undefined,
  intent: AccessTrailIntent | undefined
): AccessTrailIntent {
  if (intent) return intent;
  if (origin && !isRecordId(origin)) return "start";
  return openPage ? "extend" : "start";
}

/** Compare navigation targets without treating equivalent query encodings as changes. */
function areNavigationUrlsEqual(left: URL, right: URL) {
  return (
    left.origin === right.origin &&
    left.pathname === right.pathname &&
    left.hash === right.hash &&
    left.searchParams.toString() === right.searchParams.toString()
  );
}

/** URL, history, and resource navigation owned by the application layout. */
export const navigation = {
  /** Opens a node of the current access trail. */
  openTrailNode(index: number) {
    const trail = accessTrail.get().current;
    const node = trail?.nodes[index];
    if (!node) return;
    const from = accessTrail.position();
    accessTrail.select(node.key);
    navigation.openResource(node.id, AccessMode.PAGE, {
      trail: "select",
      from
    });
  },
  /**
   * Makes a recent trail current again and opens one of its resources, by
   * default the one that was active when the trail was left.
   */
  resumeTrail(key: string, index?: number) {
    const trail = accessTrail.get().recent.find((item) => item.key === key);
    const nodeIndex = index ?? trail?.active ?? 0;
    const node = trail?.nodes[nodeIndex];
    if (!node) return;
    const from = accessTrail.position();
    accessTrail.resume(key);
    accessTrail.select(node.key);
    navigation.openResource(node.id, AccessMode.PAGE, {
      trail: "select",
      from
    });
  },
  /**
   * Goes back from the open resource page: to the resource it was opened
   * from in the access trail, otherwise to the base page.
   */
  backInTrail() {
    const openPage = new URLSearchParams(window.location.search).get(
      AccessMode.PAGE
    );
    if (!openPage) return false;
    const trail = accessTrail.get().current;
    const parent = resolveAccessTrailParent(trail);
    if (parent === undefined || !trail) {
      navigation.closeResource({
        accessMode: AccessMode.PAGE,
        isHistoryBack: true
      });
      return true;
    }
    const parentNode = trail.nodes[parent];
    const from =
      currentEntry?.pageId === openPage ? currentEntry.state?.from : undefined;
    if (
      isSameAccessTrailPosition(accessTrail.resolve(from ?? undefined), {
        trail: trail.key,
        node: parentNode.key
      })
    ) {
      window.history.back();
      return true;
    }
    accessTrail.select(parentNode.key);
    navigation.openResource(parentNode.id, AccessMode.PAGE, { trail: "back" });
    return true;
  },
  /**
   * Keeps the access trail in step with the open page after any navigation.
   * `historyState` is the state of the history entry now shown; its recorded
   * trail position selects the exact node, also for repeated resources. When
   * that node no longer exists and the trail selects or recreates another,
   * the entry's state is rewritten to name it.
   */
  syncAccessTrail(pageId: string | undefined, historyState?: unknown) {
    if (!pageId) {
      currentEntry = undefined;
      accessTrail.sync(undefined);
      return;
    }
    const state = readAccessTrailHistoryState(historyState);
    currentEntry = { pageId, state };
    accessTrail.sync(pageId, state?.position);
    const position = accessTrail.position();
    if (
      state &&
      position &&
      !isSameAccessTrailPosition(accessTrail.resolve(state.position), position)
    ) {
      const rewritten = { position, from: state.from };
      currentEntry = { pageId, state: rewritten };
      navigation.gotoPath(window.location.href, {
        replaceState: true,
        historyState: rewritten
      });
    }
  },

  /**
   * Keeps the access trail in step with the page shown by each navigation,
   * including browser history moves, for as long as the returned
   * unsubscribe is not called.
   */
  watchAccessTrail(
    pages: Readable<{ url?: URL; state?: unknown } | undefined>
  ) {
    return pages.subscribe((current) =>
      navigation.syncAccessTrail(
        current?.url?.searchParams.get(AccessMode.PAGE) ?? undefined,
        current?.state
      )
    );
  },

  /**
   * Determines whether the app menu should be hidden for a path
   * @param newPath path which needs to checked
   * @param n view
   * @returns a boolean whether app menu should be hidden or not
   */
  checkIfNeedToHideMenu: (newPath: string) => {
    const n = get(view);
    const path = newPath.split("?")[0];
    if (path.split("/")[1]) {
      let component = appStore.resolveComponentFromPath(path.split("/")[1]);
      if (component?.isMenuHidden) return true;
    }
    const listOfPathsToHideMenu = {
      portrait: ["/objective/*", "/goal/*", "/cp/*"],
      landscape: []
    };
    if (!path) return false;
    let pathParts = path.split("/").filter((p) => p);
    if (n.isPortrait) {
      if (listOfPathsToHideMenu.portrait.includes(path)) return true;
      else if (
        pathParts.length > 1 &&
        listOfPathsToHideMenu.portrait.includes(`/${pathParts[0]}/*`)
      )
        return true;
    } else {
    }
    return false;
  },
  gotoPath: async (
    path: string,
    props?: {
      queryParams?: any;
      replaceState?: boolean;
      /** Access-trail state stored in the history entry. */
      historyState?: AccessTrailHistoryState;
    }
  ) => {
    logger.log({ method: "gotoPath", path });
    logger.info({
      at: "navigation.gotoPath",
      path,
      replaceState: props?.replaceState,
      currentPath:
        typeof window !== "undefined" ? window.location.pathname : undefined
    });
    if (props?.queryParams) {
      const queryString = new URLSearchParams(props.queryParams).toString();
      path += "?" + queryString;
    }
    appStore.update((n: IAppStore) => {
      n = {
        ...n,
        currentPath: path,
        isMenuHidden: navigation.checkIfNeedToHideMenu(path)
      };
      return n;
    });
    goto(
      path,
      false,
      props?.replaceState ?? false,
      props?.historyState
        ? { [ACCESS_TRAIL_STATE_KEY]: props.historyState }
        : undefined
    );
  },
  /**
   * Replaces the URL path with a page's canonical view path without adding a
   * history entry. Query parameters and the hash are kept unless listed in
   * `searchParams`, where null removes a parameter.
   */
  replacePagePath: (
    segments: string[],
    searchParams?: Record<string, string | null>
  ) => {
    const url = new URL(window.location.href);
    url.pathname = "/" + segments.filter(Boolean).join("/");
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    const current = new URL(window.location.href);
    current.pathname = current.pathname.replace(/(.)\/+$/, "$1");
    if (areNavigationUrlsEqual(url, current)) return;
    void navigation.gotoPath(url.href, { replaceState: true });
  },
  gotoErrorPage: (err: any) => {
    logger.log({ at: "gotoErrorPage", err });
    navigation.gotoPath("/error");
  },
  /**
   * @deprecated - use openResource instead
   * @param item
   * @param id
   * @param params
   */
  gotoResource: async (item: Resource, id: string, params: any = null) => {
    const path = `/${item}/${id}`;
    appStore.update((n: IAppStore) => {
      n = {
        ...n,
        currentPath: path,
        isMenuHidden: navigation.checkIfNeedToHideMenu(path)
      };
      return n;
    });
    goto(path);
  },
  openLink: (url: string, isOauthFlow: boolean = false) => {
    logger.log({ at: "opening link", url });
    const ctx = get(context);
    if (!url) return;
    const target = resolveNavigationLinkTarget(url, window.location.origin);
    if (!target) {
      logger.warn({ at: "navigation.openLink.unsupportedUrl" });
      return;
    }
    if (target.kind === "internal") {
      navigation.gotoPath(target.url);
      return;
    }
    if (ctx.isEmbed) {
      if (isOauthFlow) {
        postDataToParent(EmbedDataMessage.OAUTH, target.url);
      } else {
        postDataToParent(EmbedDataMessage.LINK, target.url);
      }
    } else if (target.kind === "system") {
      window.location.assign(target.url);
    } else {
      let win = window?.open(target.url, "_blank", "noopener,noreferrer");
      if (win) {
        win.focus();
      }
    }
  },
  runClientUpdate: () => {
    logger.log("running client update");
    window?.location?.reload();
  },
  resolveRecordSpecificSearchParamPrefix: (id: IRecordId) => {
    return id.toString().slice(-5);
  },
  resolveRecordSpecificSearchParam: (id: IRecordId, param: string) => {
    const prefix = navigation.resolveRecordSpecificSearchParamPrefix(id);
    return `${prefix}-${param}`;
  },
  toggleSearchParamRecordSpecific: (
    id: IRecordId,
    params:
      Record<string, string | boolean | number | null> | (string | RegExp)[],
    additional?: {
      isPreventRefresh?: boolean;
      url?: URL;
    }
  ) => {
    const prefix = navigation.resolveRecordSpecificSearchParamPrefix(id);
    let modified: Record<string, string | boolean | number | null> | string[] =
      {};
    if (Array.isArray(params)) {
      modified = params.map((p) => `${prefix}-${p}`);
    } else {
      const recordSpecificParams: Record<
        string,
        string | boolean | number | null
      > = {};
      Object.entries(params).forEach(([key, value]) => {
        recordSpecificParams[`${prefix}-${key}`] = value;
      });
      modified = recordSpecificParams;
    }
    return navigation.toggleSearchParam(modified, additional);
  },
  /**
   * Sets or deletes search params. A push that carries `historyState` adds a
   * history entry even when the URL stays the same.
   * @param params Send an object to set params, array of strings to delete
   * @returns
   */
  toggleSearchParam: (
    params:
      Record<string, string | boolean | number | null> | (string | RegExp)[],
    additional?: {
      isPreventRefresh?: boolean;
      url?: URL;
      replaceState?: boolean;
      historyState?: AccessTrailHistoryState;
    }
  ) => {
    if (!params) return;
    logger.log({ at: "toggleSearchParam", params, additional });
    const url = additional?.url ?? new URL(window.location.href);
    if (Array.isArray(params)) {
      params.forEach((p) => {
        if (typeof p === "string" && !url.searchParams.get(p)) return;
        if (typeof p === "string") url.searchParams.delete(p);
        else if (p instanceof RegExp) {
          url.searchParams.forEach((value, key) => {
            if (p.test(key)) url.searchParams.delete(key);
          });
        }
      });
      if (
        !additional?.isPreventRefresh &&
        (!areNavigationUrlsEqual(url, new URL(window.location.href)) ||
          (additional?.replaceState === false && !!additional.historyState))
      ) {
        navigation.gotoPath(url.href, {
          replaceState: additional?.replaceState ?? true,
          historyState: additional?.historyState
        });
      }
      return url;
    }
    if (typeof params !== "object") return;
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value.toString());
    });
    if (
      !additional?.isPreventRefresh &&
      (!areNavigationUrlsEqual(url, new URL(window.location.href)) ||
        (additional?.replaceState === false && !!additional.historyState))
    ) {
      navigation.gotoPath(url.href, {
        replaceState: additional?.replaceState ?? true,
        historyState: additional?.historyState
      });
    }
    return url;
  },
  /**
   * Determines if the current view is a full view or a pop view
   * @returns
   */
  isOverlay: (recordId?: IRecordId) => {
    if (recordId) {
      const accessMode = determineResourceAccessMode(recordId);
      return accessMode === AccessMode.PAGE;
    }
    return new URLSearchParams(window.location.search).get(AccessMode.PAGE);
  },
  /**
   * Access mode for a modified click: Cmd (or Ctrl) opens beside the base page
   * or beside the open page, Shift opens a page in full screen.
   */
  determineClickAccessMode: (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey) return AccessMode.BESIDE_BASE;
    if (event.shiftKey) return AccessMode.PAGE;
  },
  /**
   * Link target that opens `id` in `accessMode` from the current URL, with the
   * same record state cleared as opening it through `openResource`.
   */
  resolveResourceHref(id: IRecordId, accessMode: AccessMode) {
    const url = clearOpenedRecordParams(
      new URL(window.location.href),
      id,
      accessMode
    );
    url.searchParams.set(accessMode, id.toString());
    return `${url.pathname}${url.search}${url.hash}`;
  },
  /** Whether a click asks for the page to open in full screen. */
  isFullScreenClick: (event: MouseEvent | undefined) =>
    !!event?.shiftKey && !event.metaKey && !event.ctrlKey,
  openResource: (
    id: IRecordId,
    accessMode?: AccessMode,
    params?: {
      origin?: Action | IRecordId;
      replaceId?: IRecordId;
      searchParams?: Record<string, string | boolean | number | null>;
      /** Turns full screen on for a page. */
      isFullScreen?: boolean;
      trail?: AccessTrailIntent;
      /**
       * Trail node of the open page, for callers that change the trail before
       * opening; otherwise read from the current history entry or the trail.
       */
      from?: AccessTrailPosition;
    }
  ) => {
    logger.log({ at: "openResource", id, accessMode, params });
    if (!id) return;
    let url = new URL(window.location.href);
    const timestamp = new Date();
    const runtime = get(datafnRuntime);
    if (runtime?.remoteUrl)
      void datafn.accessLog
        .mutate({
          operation: "insert",
          record: {
            id: generateResourceId(Resource.accessLog),
            resource: id.toString()?.split(":")[0],
            action: ResourceActionType.OPEN,
            resourceId: id,
            timestamp
          }
        })
        .catch((error) =>
          logger.error({ at: "openResource.accessLog", error })
        );
    if (accessMode === AccessMode.BESIDE_BASE) {
      const isFullOrPop = navigation.isOverlay(params?.replaceId);
      if (isFullOrPop) accessMode = AccessMode.BESIDE_PAGE;
      else accessMode = AccessMode.BESIDE_BASE;
    }
    if (
      (get(view).isPortrait ||
        isCommandModeLayout(
          get(appStore).interactionMode,
          get(context).embed
        )) &&
      (accessMode === AccessMode.BESIDE_BASE ||
        accessMode === AccessMode.BESIDE_PAGE)
    ) {
      accessMode = AccessMode.PAGE;
    }
    logger.log({ at: "openResource", accessMode });
    if (recordedAccessModes.has(accessMode)) {
      recordResourceOpen(id, params?.origin);
    }
    let isCloseNavigator = false;
    let navigatorLayer: AccessMode | undefined;
    let isPushHistory = false;
    let historyState: AccessTrailHistoryState | undefined;
    if (accessMode === AccessMode.PAGE) {
      const openPage = url.searchParams.get(AccessMode.PAGE);
      const recorded =
        currentEntry?.pageId === openPage
          ? accessTrail.resolve(currentEntry.state?.position)
          : undefined;
      const entryPosition =
        recorded && accessTrail.has(recorded) ? recorded : undefined;
      const openPosition = openPage
        ? (entryPosition ?? params?.from ?? accessTrail.position())
        : undefined;
      const intent = resolveAccessTrailIntent(
        openPage,
        params?.origin,
        params?.trail
      );
      navigatorLayer = resolveNavigatorLayer(url);
      const isNavigatorOpen = !!navigatorLayer;
      if (intent === "start" && openPage !== id.toString()) {
        accessTrail.start(
          id.toString(),
          params?.origin && !isRecordId(params.origin)
            ? params.origin
            : undefined
        );
        isCloseNavigator = isNavigatorOpen;
      } else if (intent === "select") {
        isCloseNavigator =
          isNavigatorOpen &&
          (get(view).isPortrait || navigatorLayer === AccessMode.OVERLAY);
      } else if (intent === "extend") {
        accessTrail.extend(id.toString());
      }
      const position = accessTrail.position();
      const isOtherEntry =
        openPage !== id.toString() ||
        (intent === "select" &&
          !!openPosition &&
          !isSameAccessTrailPosition(position, openPosition));
      if (isOtherEntry && position) {
        if (intent === "start" || intent === "extend") {
          forgetPageScroll(id.toString());
        }
        if (intent === "back") {
          historyState = {
            position,
            from:
              currentEntry?.pageId === openPage
                ? currentEntry.state?.from
                : undefined
          };
        } else {
          isPushHistory = true;
          historyState = { position, from: openPage ? openPosition : null };
        }
      }
    }
    url = clearOpenedRecordParams(
      url,
      id,
      accessMode ?? AppSearchParam.SELECTED
    );
    navigation.toggleSearchParam(
      {
        ...(accessMode
          ? {
              [accessMode]: id.toString(),
              [accessMode + "At"]: timestamp.getTime()
            }
          : {
              [AppSearchParam.SELECTED]: id.toString(),
              [`${AppSearchParam.SELECTED}At`]: timestamp.getTime()
            }),
        ...(accessMode === AccessMode.PAGE && params?.isFullScreen
          ? { [AppSearchParam.MAX]: true }
          : {}),
        ...(params?.searchParams ?? {}),
        ...(isCloseNavigator && navigatorLayer
          ? { [navigatorLayer]: null }
          : {})
      },
      {
        url: url,
        replaceState: !isPushHistory,
        historyState
      }
    );
  },
  /**
   * Clears all tooltips from the DOM. This is to avoid an issue where clicking on a mention in markdown when the tooltip is activated is not removing the tooltip properly on navigation to that mention node page.
   */
  clearAllTooltips: () => {
    const tooltipsContainer = document.getElementById("tooltips");
    if (tooltipsContainer) {
      tooltipsContainer.innerHTML = "";
    }
  },
  resourceClickHandlerForGraph: (
    id: IRecordId,
    event: MouseEvent,
    params?: {
      replaceId?: IRecordId;
    }
  ) => {
    const clickAccessMode = navigation.determineClickAccessMode(event);
    let accessMode = AccessMode.BESIDE_BASE;
    if (clickAccessMode === AccessMode.BESIDE_BASE) {
      accessMode = AccessMode.PAGE;
    } else if (clickAccessMode) {
      accessMode = clickAccessMode;
    }
    navigation.openResource(id, accessMode, {
      replaceId: params?.replaceId,
      isFullScreen: navigation.isFullScreenClick(event)
    });
  },
  goBack: (resource?: IRecordId) => {
    appEvents.nav(resource?.toString() ?? "");
    const existingParams = new URLSearchParams(window.location.search);
    const backQueryParam = existingParams.get("back");
    const returnToQueryParam = existingParams.get("returnTo");
    if (backQueryParam) {
      navigation.gotoPath(backQueryParam, {
        queryParams: returnToQueryParam
          ? {
              returnTo: returnToQueryParam
            }
          : {}
      });
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    }
  },
  goForward: () => {
    if (window.history.length > 1) {
      window.history.forward();
    }
  },
  /**
   * Handles resource click.
   *
   * Sending replaceId will use current access mode of the replaceId resource as defaultTo.
   *
   * @param event - mouse event
   * @param id - resource id to be opened
   * @param defaultTo - default access mode
   * @param params - additional params
   * @returns
   */
  resourceClickHandler: (
    event: MouseEvent | undefined,
    id: IRecordId,
    params?: {
      origin?: Action | IRecordId;
      defaultTo?: AccessMode;
      isInPlace?: boolean;
      replaceId?: IRecordId;
      searchParams?: Record<string, string | boolean | number | null>;
    }
  ) => {
    if (!id) return;
    navigation.toggleSearchParam([AppSearchParam.VIEW]);
    let accessMode;
    const defaultTo = params?.isInPlace
      ? undefined
      : (params?.defaultTo ??
        (params?.replaceId
          ? determineResourceAccessMode(params.replaceId)
          : AccessMode.PAGE));
    if (event) accessMode = navigation.determineClickAccessMode(event);
    if (!accessMode) accessMode = defaultTo;
    logger.log({ at: "resourceClickHandler", accessMode, defaultTo });
    navigation.openResource(id, accessMode, {
      replaceId: params?.replaceId,
      searchParams: params?.searchParams,
      origin: params?.origin,
      isFullScreen: navigation.isFullScreenClick(event)
    });
    logger.log({
      at: "resourceClickHandler",
      id,
      defaultTo,
      accessMode,
      event
    });
  },
  /**
   * Closes a resource: by explicit access mode, by the mode the id is open in, or, for an id
   * rendered in place, by clearing the library selection when it is selected. With no props it
   * closes every opened layer. `isHistoryBack` closes a page the user opened from the base page
   * by going back in history; callers that navigate right after closing leave it off.
   */
  closeResource: (props?: {
    id?: IRecordId;
    accessMode?: AccessMode;
    isRestrictToModals?: boolean;
    isHistoryBack?: boolean;
  }) => {
    appEvents.nav(props?.id?.toString() ?? "");
    const resolvedMode =
      !props?.accessMode && props?.id
        ? determineResourceAccessMode(props.id)
        : undefined;
    const isInPlace = !!props?.id && !props?.accessMode && !resolvedMode;
    const currentUrl = new URL(window.location.href);
    const url =
      navigation.toggleSearchParam(
        isInPlace
          ? recordSpecificSearchParams.filter(
              (param) =>
                param !== AccessMode.BESIDE_PAGE &&
                param !== AppSearchParam.BESIDE_PAGE_AT
            )
          : recordSpecificSearchParams,
        { isPreventRefresh: true }
      ) ?? new URL(window.location.href);
    const closedModes = props?.accessMode
      ? [props.accessMode]
      : props?.id
        ? []
        : props?.isRestrictToModals
          ? [AccessMode.PAGE, AccessMode.BESIDE_PAGE]
          : closableLayerModes;
    clearLayerScopedRecordParams(url, [
      props?.id,
      ...closedModes.map((mode) => currentUrl.searchParams.get(mode)),
      isInPlace
        ? undefined
        : currentUrl.searchParams.get(AccessMode.BESIDE_PAGE)
    ]);
    const withPageParams = (mode: AccessMode) =>
      mode === AccessMode.PAGE
        ? [
            AccessMode.PAGE,
            `${AccessMode.PAGE}At`,
            AccessMode.BESIDE_PAGE,
            `${AccessMode.BESIDE_PAGE}At`,
            ...(isFullScreenOverlayOpen(url.searchParams)
              ? []
              : [AppSearchParam.MAX])
          ]
        : [mode, `${mode}At`];
    const closeMode = (mode: AccessMode) => {
      const openPage = url.searchParams.get(AccessMode.PAGE);
      if (mode === AccessMode.PAGE && openPage) {
        const isPushedFromBase =
          currentEntry?.pageId === openPage &&
          currentEntry.state?.from === null;
        if (props?.isHistoryBack && isPushedFromBase) {
          window.history.back();
          return;
        }
        navigation.toggleSearchParam(withPageParams(mode), {
          url,
          replaceState: false
        });
        return;
      }
      navigation.toggleSearchParam(withPageParams(mode), { url });
    };
    if (props?.accessMode) {
      closeMode(props.accessMode);
      return;
    }
    if (resolvedMode) {
      closeMode(resolvedMode);
      return;
    }
    if (props?.id) {
      const isSelected =
        url.searchParams.get(AppSearchParam.SELECTED) === props.id.toString();
      navigation.toggleSearchParam(
        isSelected
          ? [AppSearchParam.SELECTED, `${AppSearchParam.SELECTED}At`]
          : [],
        { url }
      );
      return;
    }
    if (props?.isRestrictToModals) {
      closeMode(AccessMode.PAGE);
      return;
    }
    closableLayerModes.forEach((mode) => {
      removeSearchParam(mode);
      removeSearchParam(`${mode}At`);
    });
    removeSearchParam(AppSearchParam.MAX);
    navigation.gotoPath(url.href);

    function removeSearchParam(param: string) {
      if (!url.searchParams.get(param)) return;
      url.searchParams.delete(param);
    }
  },
  /**
   * Toggles full screen, which hides the app menu around the resource page.
   * A resource that is not the open page is opened as the page first.
   */
  toggleFullScreen: (
    currentMode: AccessMode | undefined,
    resourceId: IRecordId
  ) => {
    logger.log({ at: "toggleFullScreen", currentMode, resourceId });
    const searchParams = new URLSearchParams(window.location.search);
    if (isFullScreenPage(resourceId, searchParams)) {
      navigation.exitFullScreen();
      return;
    }
    if (searchParams.get(AccessMode.PAGE) === resourceId?.toString()) {
      navigation.toggleSearchParam({ [AppSearchParam.MAX]: true });
      return;
    }
    navigation.openResource(resourceId, AccessMode.PAGE, {
      isFullScreen: true,
      searchParams:
        currentMode && currentMode !== AccessMode.PAGE
          ? { [currentMode]: null }
          : undefined
    });
  },
  /**
   * Turns full screen off without closing the page. Over a full screen
   * overlay, that overlay leaves full screen too and hands over to its player.
   */
  exitFullScreen: () => {
    if (isFullScreenOverlayOpen(new URLSearchParams(window.location.search))) {
      fullScreen.hide();
      return;
    }
    navigation.toggleSearchParam([AppSearchParam.MAX]);
  },
  setCurrentPath: (path: string) => {
    appStore.update((n: IAppStore) => {
      n = {
        ...n,
        currentPath: path,
        isMenuHidden: navigation.checkIfNeedToHideMenu(path)
      };
      return n;
    });
  }
};

import { get, writable } from "svelte/store";
import { AppSkin } from "$lib/client/types/appearance.type";
import type { AppStore } from "$lib/client/types/appStore.type";
import type { DragAndDrop } from "$lib/client/types/draganddrop.type";
import { DragStatus } from "$lib/client/types/dragstatus.enum";
import blankJson from "$lib/client/data/blank.json";
import colorSchemes from "$lib/client/theme/colorschemes.json";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { shuffleEmojis } from "../data/avatars";
import { ActionType, type IAction } from "../types/action.type";
import {
  IdentityProvider,
  type OAuthProviderConfig
} from "../types/oauth.type";
import { goto } from "../utils/browser.utils";
import { persistLocally, getDapId } from "../persistence/persistence.utils";
import { postToParent } from "$lib/client/utils/embed.utils";
import modalEvent from "../components/modal/modal.store";
import view from "$lib/client/stores/view.store";
import context from "$lib/client/stores/context.store";
import {
  appEvents,
  confirmationNotification
} from "$lib/client/stores/notification.store";
import { Embed, OperatingSystem } from "../types/context.type";
import { accessLogStore } from "../components/accessLogging/accesslog.store";
import {
  ResourceAccessMode,
  ResourceActionType
} from "../components/flux/resourceStores/resource.type";
import { InteractionMode } from "../components/settings/interactionMode/interactionMode.type";
import { Action } from "../types/action.enum";
import type { Event } from "../types/event.enum";
import { logger } from "../components/debug/logger.client";
import { Size } from "../types/size.enum";
import type { IRecordId } from "../types/data.type";
import account from "./account.store";
import { tabs } from "../layout/tabs/tabs.store";
import { resourceAction } from "../components/flux/resourceStores/resource.utils";

// export const app = writable<{ product: string; env: string }>({
//   product: "tidy",
//   env: "dev"
// });
// export const appEvents = initEventStore({ event: AppEvent.NONE, value: false });

export const currentTime = writable<Date>(new Date());
export const appLoadingState = writable<{
  isBaseLoaded: boolean;
  isLocalLoaded: boolean;
}>({ isBaseLoaded: false, isLocalLoaded: false });
export const leftThresholdCrossedStore = writable("");
export const isTouchDevice = writable(false);

export const appStoreShuffleEmojis = writable(shuffleEmojis);
export const intercomId = import.meta.env?.VITE_INTERCOM_ID ?? "esh1m4xq";
export const selectedTimePeriod = writable<Date>(new Date());

/**
 * Paths that are excluded to redirection checks like login
 */
export const excludedPathsForRedirectionCheck = [
  "expired",
  "signup",
  "login",
  "404",
  "onboarding",
  "error",
  "welcome",
  "play",
  "fw",
  Action.EXTENSTION_LOGIN,
  "oauth"
];

let blankDetails: any = blankJson.find(
  (subatom: any) => subatom.url == "blank.coop"
);
export const blank = writable(blankDetails);

export const dragAndDropStore = createDragAndDropStore();

function createDragAndDropStore() {
  const { subscribe, set, update } = writable<DragAndDrop>({
    dragItem: {},
    dropItem: {},
    dragEnterItem: {},
    dragLeaveItem: {},
    dragStatus: DragStatus.NONE,
    dragId: "",
    dragEnterId: "",
    dropId: "",
    forwardDrop: false
  });

  return {
    subscribe,
    set,
    update,
    reset: () => {
      set({
        dragItem: {},
        dropItem: {},
        dragEnterItem: {},
        dragLeaveItem: {},
        dragStatus: DragStatus.NONE,
        dragId: "",
        dragEnterId: "",
        dropId: "",
        forwardDrop: false
      });
    }
  };
}

//todo - generate cool placeholders for focus using AI
//"three", "four", "wood","DEF5E5", "EEF1FF", "FBF8F1", "F0ECE3"
//["light", "dark", "dracula", "dark-forest", "light-smoothy", "light-grainy"]
//App modes: minimal, journal, future (3026)
//themes: clean, playful, neomorphic, neobrutal, glassmorphic

const tempColorSchemes = [
  "scheme1",
  "scheme2",
  "scheme3",
  "scheme4",
  "scheme5",
  "scheme6",
  "scheme7",
  "scheme8",
  "scheme9",
  "scheme10",
  "scheme11"
];

const isDebugMode =
  import.meta.env?.DEV && import.meta.env?.VITE_ISDEBUG === "true";
const isExperimentalMode =
  import.meta.env?.DEV && import.meta.env?.VITE_ISEXPERIMENTAL === "true";

let themes = [AppSkin.Clean, AppSkin.Glassy];
if (isDebugMode) themes = themes.concat([AppSkin.Vibrant, AppSkin.Futuristic]);
export const appConstants = {
  themes,
  colorSchemes,
  tempColorSchemes
};

export const appStore = initAppStore({
  product: "tidy",
  env: "dev",
  isDebugMode,
  isExperimentalMode,
  appData: {},
  currentPath: "",
  isMenuHidden: false,
  actions: [],
  interactionMode: InteractionMode.DEFAULT
});

function initAppStore(seed: AppStore) {
  const { subscribe, set, update } = writable<AppStore>(seed);

  const resolveComponentFromPath = (path: string) => {
    const actions = get(appStore).actions;
    let component = actions.find((x) => x.path == path);
    if (component) return component;
    component = actions.find((x) => x.action == path);
    if (component) return component;
    if (component) return component;
    return null;
  };
  /**
   * Determines whether the app menu should be hidden for a path
   * @param newPath path which needs to checked
   * @param n view
   * @returns a boolean whether app menu should be hidden or not
   */
  const checkIfNeedToHideMenu = (newPath: string) => {
    const n = get(view);
    const path = newPath.split("?")[0];
    if (path.split("/")[1]) {
      let component = resolveComponentFromPath(path.split("/")[1]);
      if (component?.isMenuHidden) return true;
    }
    const listOfPathsToHideMenu = {
      portrait: ["/goal/*", "/cp/*"],
      landscape: []
    };
    if (!path) return false;
    let pathParts = path.split("/").filter((p) => p);
    if (n.isPortrait) {
      if (listOfPathsToHideMenu.portrait.includes(path)) return true;
      //currently only supports one level deep, but can be extended to support more
      else if (
        pathParts.length > 1 &&
        listOfPathsToHideMenu.portrait.includes(`/${pathParts[0]}/*`)
      )
        return true;
    } else {
      //check for landscape
    }
    return false;
  };
  const gotoPath = async (
    path: string,
    props?: {
      queryParams?: any;
    }
  ) => {
    logger.log({ method: "gotoPath", path });
    //TODO
    // appStore.hideFullScreenPlayer();
    update((n: AppStore) => {
      n = {
        ...n,
        currentPath: path,
        isMenuHidden: checkIfNeedToHideMenu(path)
      };
      return n;
    });
    if (props?.queryParams) {
      const queryString = new URLSearchParams(props.queryParams).toString();
      path += "?" + queryString;
    }
    goto(path);
  };
  const gotoErrorPage = (err: any) => {
    //TODO - log error, show error code on error page
    logger.log({ at: "gotoErrorPage", err });
    gotoPath("/error");
  };

  /**
   * @deprecated - use openResource instead
   * @param item
   * @param id
   * @param params
   */
  const gotoResource = async (
    item: Resource,
    id: string,
    params: any = null
  ) => {
    const path = `/${item}/${id}`;
    update((n: AppStore) => {
      n = {
        ...n,
        currentPath: path,
        isMenuHidden: checkIfNeedToHideMenu(path)
      };
      return n;
    });
    goto(path);
  };
  const resolveAction = (slug: string) => {
    const actions = get(appStore).actions;
    let action = actions.find(
      (x) => x.action?.toLowerCase() == slug.toLowerCase()
    );
    const contextData = get(context);
    const accountData = get(account);
    if (action && action.hideContext?.includes(contextData.embed)) return null;
    if (action && action.hideContext?.includes(contextData.os)) return null;
    if (action && action.hideContext?.includes(accountData.dataMode))
      return null;
    if (action) return action;
    return null;
  };

  const runAction = (
    slug: string,
    params: {
      componentParams?: any;
      isReturnIfComponent?: boolean;
      searchParams?: Record<string, string | boolean | number>;
    } = {
      componentParams: undefined,
      isReturnIfComponent: false,
      searchParams: undefined
    }
  ) => {
    let action = resolveAction(slug);
    logger.log({ at: "runAction", action, slug });
    if (!action) {
      gotoPath("404");
      return;
    }
    const store = get(appStore);
    const ctx = get(context);
    const viewData = get(view);
    const isRenderAsPage =
      action.isRenderAsPageInPortrait && viewData.isPortrait;
    if (action.type === ActionType.LINK) {
      const url = store.appData.urls[action.action];
      if (!url) return;
      if (url) return openLink(url);
    } else if (action.type === ActionType.FUNCTION) {
      if (!action.fn) return;
      return action.fn({
        componentParams: params?.componentParams,
        view: viewData,
        context: ctx
      });
    } else if (action.type === ActionType.SEARCH_CMD) {
      appStore.runAction(Action.CMD, {
        componentParams: {
          command: action.action,
          commandType: action.type,
          componentParams: params?.componentParams
        }
      });
    } else if (action.type === ActionType.EVENT) {
      appEvents.publish(action.action as Event, params?.componentParams);
    } else if (action.type === ActionType.CONFIRMATION && action.confirmation) {
      confirmationNotification.notify(action.confirmation);
    } else if (params.isReturnIfComponent) {
      return action;
    } else if (action.type === ActionType.RESOURCE && !isRenderAsPage) {
      openResource(action.action, action.accessMode ?? ResourceAccessMode.POP, {
        searchParams: params?.searchParams
      });
    } else if (action.type === ActionType.MODAL && !isRenderAsPage) {
      modalEvent.notify({
        path: action.action,
        isShow: true,
        componentParams: {
          ...(action?.componentParams ?? {}),
          ...(params?.componentParams ?? {})
        },
        ...action.modalParams
      });
    } else if (action.component) {
      logger.log({ at: "running action", action });
      if (
        store.interactionMode === InteractionMode.COMMAND_ONLY &&
        ctx.embed !== Embed.HANDSET
      ) {
        toggleSearchParam({ tab: "page:" + action.action });
      } else {
        gotoPath("/" + (action.path ?? action.action));
      }
      return;
    }
  };
  const openLink = (url: string, isOauthFlow: boolean = false) => {
    logger.log({ at: "opening link", url });
    const ctx = get(context);
    if (!url) return;
    if (!url.includes("http")) {
      gotoPath(url);
      return;
    }
    if (ctx.isEmbed) {
      if (isOauthFlow) {
        postToParent({
          oauth: url
        });
      } else {
        postToParent({
          link: url
        });
      }
    } else {
      let win = window?.open(url, "_blank");
      if (win) {
        win.focus();
      }
    }
  };

  const initiateOAuth2Flow = async (
    provider: IdentityProvider,
    guest?: string
  ) => {
    const ctx = get(context);
    const app = get(appStore);
    const oAuthConfig: OAuthProviderConfig[] = app.appData?.oAuthConfig;
    if (!oAuthConfig || oAuthConfig.length < 1) return;
    const config = oAuthConfig.find((c) => c.provider === provider);
    if (!config) return;
    const dev = import.meta.env?.DEV;
    const host =
      ctx.isEmbed || dev || window.location.hostname === "localhost"
        ? import.meta.env?.VITE_HOST
        : window.location.hostname;
    const redirect = ctx.isEmbed
      ? (import.meta.env?.VITE_OAUTH_REDIRECT ?? "https://" + host)
      : window.location.origin;
    // const origin = window.location.origin;
    const guestPartForState = guest ?? (await getDapId()) ?? "";
    const domainPartForState =
      ctx.os === OperatingSystem.MACOS &&
      ctx.isEmbed &&
      provider === IdentityProvider.Apple
        ? "localredirect." + host
        : host;
    let url =
      config.authorise_url +
      "?client_id=" +
      config.client_id +
      "&scope=" +
      config.scope +
      "&response_type=" +
      (config.response_type ?? "code") +
      "&state=" +
      guestPartForState +
      ":" +
      domainPartForState +
      "&prompt=select_account";
    let redirectUri = "";
    if (config.response_mode === "form_post") {
      url += "&response_mode=form_post";
    }
    if (config.isRedirectToClient) {
      redirectUri = redirect + "/oauth/" + config.oauth_slug;
    } else {
      redirectUri =
        import.meta.env?.VITE_API_URL + "/oauth/" + config.oauth_slug;
    }
    if (config.code_challenge_method) {
      //TODO generate code challenge
      url +=
        "&code_challenge=challenge&code_challenge_method=" +
        config.code_challenge_method;
    }
    if (!redirectUri) return;
    url += "&redirect_uri=" + redirectUri;
    // url += "&redirect_uri=" + encodeURIComponent(redirectUri);
    if (ctx.isEmbed) {
      if (
        provider === IdentityProvider.Apple &&
        ctx.os === OperatingSystem.MACOS
      ) {
        goto(url);
        return;
      }

      if (
        ctx.os === OperatingSystem.MACOS ||
        ctx.os === OperatingSystem.WINDOWS
      ) {
        const host =
          dev || app.isDebugMode
            ? "http://localhost:5002"
            : `https://${import.meta.env?.VITE_HOST}`;
        url = `${host}/embed?provider=${config.oauth_slug}&guest=${guestPartForState}`;
      }
      openLink(url, ctx.os === OperatingSystem.IOS);
    } else {
      goto(url);
    }
  };

  function runClientUpdate() {
    logger.log("running client update");
    //todo - show user a message that an update is available - auto updating for now
    window?.location?.reload();
  }

  /**
   * Sets or deletes search params
   * @param params Send an object to set params, array of strings to delete
   * @returns
   */
  const toggleSearchParam = (
    params: Record<string, string | boolean | number> | string[],
    additional?: {
      isPreventRefresh?: boolean;
      url?: URL;
    }
  ) => {
    if (!params) return;
    logger.log({ at: "toggleSearchParam", params, additional });
    const url = additional?.url ?? new URL(window.location.href);
    if (Array.isArray(params)) {
      params.forEach((p) => {
        if (!url.searchParams.get(p)) return;
        url.searchParams.delete(p);
      });
      if (!additional?.isPreventRefresh) appStore.gotoPath(url.href);
      return url;
    }
    if (typeof params !== "object") return;
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString());
    });
    if (!additional?.isPreventRefresh) appStore.gotoPath(url.href);
    return url;
  };
  /**
   * Determines if the current view is a full view or a pop view
   * @returns
   */
  const isOverlay = (recordId?: IRecordId) => {
    if (recordId) {
      const accessMode = determineResourceAccessMode(recordId);
      return (
        accessMode === ResourceAccessMode.POP ||
        accessMode === ResourceAccessMode.FULL
      );
    }
    return (
      new URLSearchParams(window.location.search).get(
        ResourceAccessMode.FULL
      ) ||
      new URLSearchParams(window.location.search).get(ResourceAccessMode.POP)
    );
  };
  const determineCurrentResourceAccessMode1 = (id: string) => {
    if (
      new URLSearchParams(window.location.search).get(
        ResourceAccessMode.POP
      ) === id
    )
      return ResourceAccessMode.POP;
    else if (
      new URLSearchParams(window.location.search).get(
        ResourceAccessMode.FULL
      ) === id
    )
      return ResourceAccessMode.FULL;
    else if (
      new URLSearchParams(window.location.search).get(
        ResourceAccessMode.SPLIT
      ) === id
    )
      return ResourceAccessMode.SPLIT;
    else if (
      new URLSearchParams(window.location.search).get(
        ResourceAccessMode.FSPLIT
      ) === id
    )
      return ResourceAccessMode.FSPLIT;
    else return ResourceAccessMode.INLINE;
  };

  const determineResourceAccessMode = (id: IRecordId): ResourceAccessMode => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = (Object.values(ResourceAccessMode) as string[]).find(
      (m) =>
        m !== ResourceAccessMode.INLINE && searchParams.get(m) === id.toString()
    );
    return (mode as ResourceAccessMode) || ResourceAccessMode.INLINE;
  };

  /**
   *
   * TODO - shortcuts from user settings
   *
   * @param event
   * @returns
   */
  const determineClickAccessMode = (event: MouseEvent) => {
    if (event.altKey && event.metaKey) {
      return ResourceAccessMode.TAB_IN_BACKGROUND;
    } else if (event.shiftKey) return ResourceAccessMode.FULL;
    else if (event.altKey) {
      return ResourceAccessMode.SPLIT;
    } else if (event.metaKey) {
      return ResourceAccessMode.TAB;
    }
  };

  const openResource = (
    id: IRecordId,
    accessMode: ResourceAccessMode = ResourceAccessMode.INLINE,
    params?: {
      replaceId?: IRecordId;
      searchParams?: Record<string, string | boolean | number>;
    }
  ) => {
    if (!id) return;
    let url = new URL(window.location.href);
    if (accessMode === ResourceAccessMode.FULL) {
      url =
        toggleSearchParam([ResourceAccessMode.POP, ResourceAccessMode.FSPLIT], {
          isPreventRefresh: true
        }) ?? url;
    }
    const timestamp = new Date();
    accessLogStore.create({
      resource: id.tb,
      action: ResourceActionType.OPEN,
      resourceId: id,
      timestamp: timestamp.toISOString()
    });
    if (accessMode === ResourceAccessMode.TAB) {
      tabs.open(id);
      return;
    } else if (accessMode === ResourceAccessMode.TAB_IN_BACKGROUND) {
      tabs.addInBackground(id);
      return;
    }
    if (accessMode === ResourceAccessMode.SPLIT) {
      const isFullOrPop = isOverlay(params?.replaceId);
      if (isFullOrPop) accessMode = ResourceAccessMode.FSPLIT;
      else accessMode = ResourceAccessMode.SPLIT;
    }
    toggleSearchParam(
      {
        [accessMode]: id.toString(),
        [accessMode + "At"]: timestamp.getTime(),
        ...params?.searchParams
      },
      {
        url: url
      }
    );
  };

  const resourceClickHandlerForGraph = (
    id: IRecordId,
    event: MouseEvent,
    params?: {
      replaceId?: IRecordId;
    }
  ) => {
    const clickAccessMode = appStore.determineClickAccessMode(event);
    let accessMode = ResourceAccessMode.SPLIT;
    if (clickAccessMode === ResourceAccessMode.SPLIT) {
      accessMode = ResourceAccessMode.POP;
    } else if (clickAccessMode) {
      accessMode = clickAccessMode;
    }
    appStore.openResource(id, accessMode, {
      replaceId: params?.replaceId
    });
  };

  const goBack = (resource?: IRecordId) => {
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  const goForward = () => {
    if (window.history.length > 1) {
      window.history.forward();
    }
  };
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
  const resourceClickHandler = (
    event: MouseEvent,
    id: IRecordId,
    params?: {
      defaultTo?: ResourceAccessMode;
      replaceId?: IRecordId;
    }
  ) => {
    if (!id) return;
    toggleSearchParam(["view"]);
    let accessMode;
    const defaultTo =
      params?.defaultTo ??
      (params?.replaceId
        ? determineResourceAccessMode(params.replaceId)
        : ResourceAccessMode.POP);
    if (event) accessMode = determineClickAccessMode(event);
    if (!accessMode) accessMode = defaultTo;
    logger.log({ at: "resourceClickHandler", accessMode, defaultTo });
    openResource(id, accessMode, {
      replaceId: params?.replaceId
    });
    logger.log({
      at: "resourceClickHandler",
      id,
      defaultTo,
      accessMode,
      event
    });
  };
  const closeResource = (props?: {
    id?: IRecordId;
    accessMode?: ResourceAccessMode;
    isRestrictToModals?: boolean;
    inlineRestoreId?: IRecordId;
  }) => {
    const url = new URL(window.location.href);
    if (props?.accessMode) {
      toggleSearchParam([props.accessMode]);
      return;
    } else if (props?.id) {
      const accessMode = determineResourceAccessMode(props.id);
      if (accessMode) {
        toggleSearchParam([accessMode]);
      }
      return;
    }
    if (props?.isRestrictToModals) {
      toggleSearchParam([ResourceAccessMode.FSPLIT, ResourceAccessMode.POP]);
      return;
    }
    const prevMode = url.searchParams.get("prev");
    if (prevMode === ResourceAccessMode.INLINE && props?.inlineRestoreId)
      url.searchParams.set(prevMode, props?.inlineRestoreId.toString());
    removeSearchParam("prev");
    removeSearchParam(ResourceAccessMode.SPLIT);
    removeSearchParam(ResourceAccessMode.FULL);
    removeSearchParam(ResourceAccessMode.POP);
    removeSearchParam(ResourceAccessMode.FSPLIT);
    appStore.gotoPath(url.href);

    function removeSearchParam(param: string) {
      if (!url.searchParams.get(param)) return;
      url.searchParams.delete(param);
    }
  };

  const toggleFullAccessMode = (
    currentMode: ResourceAccessMode,
    resourceId: IRecordId
  ) => {
    logger.log({ at: "toggleFullAccessMode", currentMode, resourceId });
    const url = new URL(window.location.href);
    removeSearchParam(currentMode);
    if (currentMode === ResourceAccessMode.FULL) {
      const prevMode = url.searchParams.get("prev");
      logger.log({ at: "toggleFocusAccessMode", currentMode, prevMode });
      if (prevMode) url.searchParams.set(prevMode, resourceId.toString());
      else url.searchParams.set(ResourceAccessMode.POP, resourceId.toString());
      removeSearchParam("prev");
    } else {
      url.searchParams.set(ResourceAccessMode.FULL, resourceId.toString());
      url.searchParams.set("prev", currentMode);
    }
    appStore.gotoPath(url.href);

    function removeSearchParam(param: string) {
      if (!url.searchParams.get(param)) return;
      url.searchParams.delete(param);
    }
  };

  return {
    subscribe,
    set: (m: AppStore) => {
      set(m);
    },
    update,
    initializeProductInformation: (details: {
      product: string;
      env: string;
    }) => {
      update((n: AppStore) => {
        n.product = details.product;
        n.env = details.env;
        return n;
      });
    },
    loadAppData(data: any, params?: { isDefaultData: boolean }) {
      update((n: AppStore) => {
        const env = n.env;
        if (data.env && data.env[env]) {
          n.appData = { ...data, ...data.env[env] };
        } else {
          n.appData = data;
        }
        if (!params?.isDefaultData) {
          persistLocally(Resource.appData, data);
        }
        return n;
      });
    },
    turnDebugMode(isDebugMode: boolean) {
      update((n: AppStore) => {
        n.isDebugMode = isDebugMode;
        return n;
      });
    },

    /**
     * @deprecated - use player store instead
     * @param path
     * @param params
     */
    showMiniPlayer(path: string, params: any = null) {
      update((n: AppStore) => {
        n.player = path;
        //n.playerParams = params;
        return n;
      });
    },
    /**
     * @deprecated - use player store instead
     * @param path
     */
    togglePip(path: string) {
      update((n: AppStore) => {
        if (!n.player) n.player = path;
        n.isPipOn = !n.isPipOn;
        return n;
      });
    },
    /**
     * @deprecated - use player store instead
     */
    hideMiniPlayer() {
      update((n: AppStore) => {
        n.player = undefined;
        return n;
      });
    },
    /**
     * @deprecated - use player store instead
     * @param path
     */
    showFullScreenPlayer(path: string) {
      logger.log({ at: "showFullScreenPlayer", path });
      update((n: AppStore) => {
        n.fullScreenComponentPath = path;
        runAction(path);
        n.player = undefined;
        return n;
      });
      toggleSearchParam({ fsp: path });
    },
    /**
     * @deprecated - use player store instead
     * @param isHideMiniPlayer - hides the mini player if true
     */
    hideFullScreenPlayer(isHideMiniPlayer: boolean = false) {
      update((n: AppStore) => {
        if (n.fullScreenComponentPath && !isHideMiniPlayer)
          n.player = resolveComponentFromPath(
            n.fullScreenComponentPath
          )?.associatedPlayer;
        else if (isHideMiniPlayer) n.player = undefined;
        modalEvent.hide(n.fullScreenComponentPath ?? "", "app.store");
        // n.fullScreenComponentPath = undefined;
        return n;
      });
      toggleSearchParam(["fsp"]);
    },
    /**
     * @deprecated - use player store instead
     * @returns
     */
    restoreFullScreenPlayer() {
      const fspParam = new URLSearchParams(window.location.search).get("fsp");
      if (fspParam) {
        appStore.showFullScreenPlayer(fspParam);
        return true;
      }
    },
    /**
     * @deprecated - use player store instead
     */
    showAssociatedPlayerIfRequired() {
      update((n: AppStore) => {
        if (n.fullScreenComponentPath) {
          n.player = resolveComponentFromPath(
            n.fullScreenComponentPath
          )?.associatedPlayer;
        }
        return n;
      });
    },
    toggleMenuVisibility: (isHidden?: boolean) => {
      update((n: AppStore) => {
        if (isHidden !== undefined && isHidden !== null) {
          n = { ...n, isMenuHidden: isHidden };
        } else {
          n = { ...n, isMenuHidden: !n.isMenuHidden };
        }
        return n;
      });
    },
    toggleTopBar: (isMinimal: boolean) => {
      update((n: AppStore) => {
        n = { ...n, isMinimalTopBar: isMinimal };
        return n;
      });
    },
    setCurrentPath: (path: string) => {
      update((n: AppStore) => {
        n = {
          ...n,
          currentPath: path,
          isMenuHidden: checkIfNeedToHideMenu(path)
        };
        return n;
      });
    },
    initActions: (actions: IAction[], settings: IAction[]) => {
      update((n: AppStore) => {
        if (!n.actions) n.actions = [];
        n.actions = [...actions, ...settings];
        return n;
      });
    },
    initActionsForSheet: (actions: IAction[]) => {
      update((n: AppStore) => {
        n.actions = [...actions];
        return n;
      });
    },
    runResourceAction: (resource: Resource, action: ResourceActionType) => {
      return runAction(resourceAction(resource, action));
    },
    gotoPath,
    gotoErrorPage,
    gotoResource,
    resolveAction,
    resolveComponentFromPath,
    openLink,
    runAction,
    initiateOAuth2Flow,
    toggleSearchParam,
    resourceClickHandler,
    resourceClickHandlerForGraph,
    openResource,
    toggleFullScreen: toggleFullAccessMode,
    determineResourceAccessMode,
    determineClickAccessMode,
    isOverlay,
    closeResource,
    goBack,
    goForward
  };
}

export const isInEditMode = initEditModeStore();

function initEditModeStore() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    set,
    toggle: (val?: boolean) => {
      update((n: boolean) => {
        if (val !== undefined) return val;
        return !n;
      });
    }
  };
}

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
import type {
  IdentityProvider,
  OAuthProviderConfig
} from "../types/oauth.type";

import { debouncer } from "$lib/client/utils/utils";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/persistence/persistence.utils";
import { postToParent } from "$lib/client/utils/embed.utils";
import modalEvent from "../components/modal/modal.store";
import view from "$lib/client/stores/view.store";
import context from "$lib/client/stores/context.store";
import {
  appEvents,
  confirmationNotification
} from "$lib/client/stores/notification.store";

import { defaultAppData } from "$local/local";
import { Embed, OperatingSystem } from "../types/context.type";
import { goto } from "../utils/browser.utils";
import { accessLogStore } from "../components/accessLogging/accesslog.store";
import { ResourceAccessMode } from "../components/flux/resourceStores/resource.type";
import { InteractionMode } from "../components/settings/interactionMode/interactionMode.type";
import { Action } from "../types/action.enum";
import type { Event } from "../types/event.enum";
import { logger } from "../components/debug/logger.client";
import { clientStorage } from "../persistence/persistence.utils";
import { ClientStorageKey } from "../persistence/persistence.type";
import { Size } from "../types/size.enum";
import type { IRecordId } from "../types/data.type";

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

const cachedAppData = retrieveLocally(Resource.appData);

export const appStore = initAppStore({
  product: "tidy",
  env: "dev",
  isDebugMode,
  isExperimentalMode,
  appData: cachedAppData ?? defaultAppData,
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
    // if (!navigator.onLine) {
    //   path = "/offline";
    // }
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
    if (action && action.hideContext?.includes(contextData.embed)) return null;
    if (action) return action;
    return null;
  };
  const runAction = (
    slug: string,
    params: { componentParams?: any; isReturnIfComponent?: boolean } = {
      componentParams: undefined,
      isReturnIfComponent: false
    }
  ) => {
    let action = resolveAction(slug);
    if (!action) {
      gotoPath("404");
      return;
    }
    const store = get(appStore);
    if (action.type === ActionType.LINK) {
      const url = store.appData.urls[action.action];
      if (!url) return;
      if (url) return openLink(url);
    } else if (action.type === ActionType.FUNCTION) {
      if (!action.fn) return;
      return action.fn(params?.componentParams);
    } else if (action.type === ActionType.SEARCH_CMD) {
      appStore.runAction(Action.CMD, {
        componentParams: {
          command: action.action,
          commandType: action.type
        }
      });
    } else if (action.type === ActionType.EVENT) {
      appEvents.publish(action.action as Event, params?.componentParams);
    } else if (action.type === ActionType.CONFIRMATION && action.confirmation) {
      confirmationNotification.notify(action.confirmation);
    } else if (params.isReturnIfComponent) {
      return action;
    } else if (
      action.type === ActionType.MODAL ||
      (store.interactionMode === InteractionMode.COMMAND_ONLY &&
        get(context).embed !== Embed.HANDSET)
    ) {
      if (action.type === ActionType.PAGE) {
        action.modalParams = {
          layout: {
            size: Size.full
          }
        };
      }
      modalEvent.notify({
        path: action.action,
        isShow: true,
        componentParams: params?.componentParams,
        ...action.modalParams
      });
    } else if (action.component) {
      logger.log({ at: "running action", action });
      gotoPath("/" + (action.path ?? action.action));
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

  const initiateOAuth2Flow = async (provider: IdentityProvider) => {
    const ctx = get(context);
    const oAuthConfig: OAuthProviderConfig[] =
      get(appStore).appData?.oAuthConfig;
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
    const guestPartForState =
      (await clientStorage.get(ClientStorageKey.DAP_ID)) ?? "";
    const domainPartForState =
      (ctx.os === OperatingSystem.MACOS ||
        (ctx.os == OperatingSystem.IOS && ctx.embed === Embed.TABLET)) &&
      ctx.isEmbed
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
    if (ctx.isEmbed && ctx.embed === Embed.HANDSET) {
      openLink(url, true);
    } else {
      goto(url);
    }
  };

  function runClientUpdate() {
    logger.log("running client update");
    //todo - show user a message that an update is available - auto updating for now
    window?.location?.reload();
  }

  const toggleSearchParam = (
    param: string,
    value?: string | boolean | number
  ) => {
    if (value !== undefined) {
      const url = new URL(window.location.href);
      url.searchParams.set(param, value.toString());
      appStore.gotoPath(url.href);
      return;
    }
    const url = new URL(window.location.href);
    if (!url.searchParams.get(param)) return;
    url.searchParams.delete(param);
    appStore.gotoPath(url.href);
  };
  const isFSplit = () => {
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

  const determineCurrentResourceAccessMode = (
    id: IRecordId
  ): ResourceAccessMode => {
    const searchParams = new URLSearchParams(window.location.search);

    const mode = (Object.values(ResourceAccessMode) as string[]).find(
      (m) =>
        m !== ResourceAccessMode.INLINE && searchParams.get(m) === id.toString()
    );

    return (mode as ResourceAccessMode) || ResourceAccessMode.INLINE;
  };

  const determineClickAccessMode = (event: MouseEvent) => {
    //TODO - shortcuts from user settings
    if (event.shiftKey) return ResourceAccessMode.FULL;
    else if (event.altKey) {
      const isFromFocusOrPop = isFSplit();
      if (isFromFocusOrPop) return ResourceAccessMode.FSPLIT;
      else return ResourceAccessMode.SPLIT;
    } else if (event.metaKey) {
      // TODO - open in new tab?
    }
  };

  const openResource = (
    id: IRecordId,
    accessMode: ResourceAccessMode = ResourceAccessMode.INLINE
  ) => {
    if (!id) return;
    // accessLogStore.create(
    //   {
    //     resource: id.split(":")[0],
    //     action: ResourceActionType.OPEN,
    //     resourceId: id,
    //     timestamp: new Date().toISOString()
    //   },
    //   {
    //     queueParams: {
    //       isUseQueueFirstApproach: true,
    //       mutationId: `${id}-accessLog-create`
    //     }
    //   }
    // );

    toggleSearchParam(accessMode, id.toString());
  };

  const resourceClickHandler = (
    event: MouseEvent,
    id: IRecordId,
    defaultTo: ResourceAccessMode = ResourceAccessMode.INLINE
  ) => {
    if (!id) return;
    toggleSearchParam("view");
    let accessMode;
    if (event) accessMode = determineClickAccessMode(event);
    if (accessMode) openResource(id, accessMode);
    else openResource(id, defaultTo);
    logger.log({
      at: "resourceClickHandler",
      id,
      defaultTo,
      accessMode,
      event
    });
  };
  const resourceClickHandlerWithReplace = (
    event: MouseEvent,
    id: string,
    replaceId: string
  ) => {
    const currentAccessMode = determineCurrentResourceAccessMode(replaceId);
    resourceClickHandler(event, id, currentAccessMode);
  };
  const closeResource = (props?: {
    id?: IRecordId;
    accessMode?: ResourceAccessMode;
    isRestrictToModals?: boolean;
    inlineRestoreId?: string;
  }) => {
    const url = new URL(window.location.href);
    if (props?.accessMode) {
      toggleSearchParam(props.accessMode);
      return;
    }
    if (props?.isRestrictToModals) {
      toggleSearchParam(ResourceAccessMode.FSPLIT);
      debouncer(toggleSearchParam, 100)(ResourceAccessMode.POP);
      return;
    }
    const prevMode = url.searchParams.get("prev");
    if (prevMode === ResourceAccessMode.INLINE && props?.inlineRestoreId)
      url.searchParams.set(prevMode, props?.inlineRestoreId);
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

  const toggleFocusAccessMode = (
    currentMode: ResourceAccessMode,
    resourceId: string
  ) => {
    const url = new URL(window.location.href);
    removeSearchParam(currentMode);
    if (currentMode === ResourceAccessMode.FULL) {
      const prevMode = url.searchParams.get("prev");
      logger.log({ at: "toggleFocusAccessMode", currentMode, prevMode });
      if (prevMode) url.searchParams.set(prevMode, resourceId);
      else url.searchParams.set(ResourceAccessMode.POP, resourceId);
      removeSearchParam("prev");
    } else {
      url.searchParams.set(ResourceAccessMode.FULL, resourceId);
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
    loadAppData(data: any) {
      update((n: AppStore) => {
        const env = n.env;
        if (data.env && data.env[env]) {
          n.appData = { ...data, ...data.env[env] };
        } else {
          n.appData = data;
        }
        persistLocally(Resource.appData, data);
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
      toggleSearchParam("fsp", path);
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
      toggleSearchParam("fsp");
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
    initActions: (
      actions: IAction[],
      settingsAsModal: IAction[],
      settingsAsPages: IAction[]
    ) => {
      const isInPortraitMode = get(view).isPortrait;
      update((n: AppStore) => {
        if (!n.actions) n.actions = [];
        const isSettingsAsModal = n.appData?.isSettingsAsModal;
        if (isInPortraitMode || !isSettingsAsModal)
          n.actions = [...actions, ...settingsAsPages];
        else n.actions = [...actions, ...settingsAsModal];
        return n;
      });
    },
    initActionsForSheet: (actions: IAction[]) => {
      update((n: AppStore) => {
        n.actions = [...actions];
        return n;
      });
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
    openResource,
    toggleFocusAccessMode,
    resourceClickHandlerWithReplace,
    determineCurrentResourceAccessMode,
    determineClickAccessMode,
    isFSplit,
    closeResource
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

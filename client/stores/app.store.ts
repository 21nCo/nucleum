import { get, writable } from "svelte/store";
import { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type { AppStore } from "$lib/client/types/appStore.type";
import type { DragAndDrop } from "$lib/client/types/draganddrop.type";
import { DragStatus } from "$lib/client/types/dragstatus.enum";
import {
  UIState,
  type UIStateProps,
  type UserAppearanceSettings,
  type IUserGlobalPreferences
} from "$lib/client/types/preferences.type";
import blankJson from "$lib/client/data/blank.json";
import colorSchemes from "$lib/client/theme/colorschemes.json";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { TimeScale } from "../types/time.type";
import { shuffleEmojis } from "../data/avatars";
import type { IObservableStoreSubject } from "../types/data.type";
import { ActionType, type IAction } from "../types/action.type";
import type {
  IdentityProvider,
  OAuthProviderConfig
} from "../types/oauth.type";

import { debouncer, generateUID } from "$lib/client/utils/utils";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/utils/storage.utils";
import { detectTimeZone } from "$lib/client/utils/time.utils";
import { postToParent } from "$lib/client/utils/embed.utils";

import { Persistence } from "../persistence/persistence";

import modalEvent from "../components/modal/modal.store";
import view from "$lib/client/stores/view.store";
import context from "$lib/client/stores/context.store";
import { confirmationNotification } from "$lib/client/stores/notification.store";

import { defaultAppData } from "$local/local";
import { Embed, OperatingSystem } from "../types/context.type";
import { goto } from "../utils/browser.utils";
import { accessLogStore } from "../components/accessLogging/accesslog.store";
import { KeyValueStore } from "../components/resourceStores/kv.store";
import {
  ResourceActionType,
  ResourceAccessMode
} from "../components/resourceStores/resource.type";

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
  "ext-login",
  "oauth"
];

let persistance = new Persistence();

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

//HSL - dark: x, 30, 50   light: x, 60, 70
const selectableColors = [
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#85dde0", lightHex: "#59a3a6" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" }
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

class DboVersionStore extends KeyValueStore<
  { version: number } & IObservableStoreSubject
> {
  constructor() {
    super(
      Resource.dboVersion,
      { version: 0 },
      {
        priorityRefreshOnAppAppear: true,
        isSynchronousCache: true
      }
    );
  }
  setVersion = (version: number) => {
    this.modify({ version }, { isPersist: false });
  };
  async runDboUpdate(fromVersion: number | undefined = undefined) {
    const version = get(this.subject).version;
    const response = await new Persistence().updateDbo(fromVersion ?? version);
    if (response?.version) {
      this.setVersion(response.version);
    }
  }
}
// export const dboVersion = initDboVersionStore();
export const dboVersion = new DboVersionStore();

// const userPreferencesId = Item.globalPreferences;
const defaultColorSchemeId = "colorscheme:cleantidylightblue";
const defaultDarkColorSchemeId = "colorscheme:cleantidydarkblue";

export const seedUserPreferences: IUserGlobalPreferences = {
  nickName: "",
  dayStartHour: 0,
  dayStartMinute: 0,
  birthday: new Date(),
  tempColorScheme: "scheme1",
  accessibilitySizingFactor: 1,
  timeScales: [TimeScale.DAYS, TimeScale.MONTHS, TimeScale.YEARS],
  timeFormat: "meridian",
  timeZoneOffset: new Date().getTimezoneOffset() * 60,
  timeZoneLabel: detectTimeZone()?.label ?? "UTC",
  isAnonymousAnalyticsEnabled: true,
  appearance: {
    skin: AppSkin.Clean,
    theme: Theme.LIGHT,
    isSyncWithSystem: true,
    lightColorSchemeId: defaultColorSchemeId,
    darkColorSchemeId: defaultDarkColorSchemeId
  },
  uiStates: {
    all: {
      isOnboardingComplete: false,
      isInThinMode: false
    },
    desktop: {
      isInThinMode: false
    },
    portrait: {
      isInThinMode: false
    }
  },
  avatarPicker: {
    skinIndex: 0,
    usedEmojis: [],
    iconColor: "#C14D8A",
    filled: false,
    usedIcons: []
  },
  annotations: [],
  mediaGridTestitems: [],
  infiniteGrid: {
    isGridCreated: false,
    grid: []
  }
};

class UserPreferencesStore extends KeyValueStore<IUserGlobalPreferences> {
  constructor() {
    super(Resource.globalPreferences, seedUserPreferences, {
      priorityRefreshOnAppAppear: true,
      isSynchronousCache: true
    });
  }
  loader(data: IUserGlobalPreferences) {
    if (!data.uiStates) data.uiStates = seedUserPreferences.uiStates;
    if (!data.avatarPicker)
      data.avatarPicker = seedUserPreferences.avatarPicker;
    if (!data.annotations) data.annotations = seedUserPreferences.annotations;
    if (!data.mediaGridTestitems)
      data.mediaGridTestitems = seedUserPreferences.mediaGridTestitems;
    if (data.isAnonymousAnalyticsEnabled === undefined)
      data.isAnonymousAnalyticsEnabled = true;
    const val = {
      ...data
    };
    this.modify(val, { isPersist: false });
  }
  setAppearance(x: UserAppearanceSettings) {
    const n = get(this.subject);
    const appearance = { ...n.appearance, ...x };
    this.modify({ appearance });
  }
  /**
   * Date().getTimezoneOffset() returns the offset in minutes and calculates offfset by measuring current user's timezone as 0 and relative measure of UTC from that.
   *
   * Ex: If user is in UTC+5:30, getTimezoneOffset() will return -330 which is UTC is -330 minutes away from current user's timezone.
   *
   * On the database, the offset is stored as an offset of user's zone from UTC, so the offset is stored as +330 for UTC+5:30
   *
   */
  resolveTimezoneFallback() {
    const offset = -new Date().getTimezoneOffset() * 60;
    const label = detectTimeZone()?.label ?? "UTC";
    return { offset, label };
  }
  _setTimezone(offset: number, label?: string) {
    this.modify({ timeZoneOffset: offset, timeZoneLabel: label });
    return { offset, label };
  }
  /**
   * Sets the timezone offset and label for the user
   * @param offset
   * @param label
   * @returns
   */
  async setTimeZone(offset?: number, label?: string) {
    if (offset === undefined) {
      const val = this.resolveTimezoneFallback();
      offset = val.offset;
      label = val.label;
    }
    await persistance.create(
      { offset, date: new Date().toISOString(), label: label ?? "" },
      Resource.tz
    );
    return this._setTimezone(offset, label);
  }
  /**
   * Adds a timezone record to the database on signup with 1970 as lowest to enable adding manual logs in the past or importing data from the past.
   *
   * Note: Any manual logs or imports prior to 1970 should not be allowed as it might cause unexpected errors since aggregate table views and many calculations rely on tz table and timezone offset.
   * @returns
   */
  async initializeTimeZoneForSignup() {
    let offset = 0;
    let label: string | undefined;
    const timeZone = detectTimeZone();
    if (!timeZone) {
      const val = this.resolveTimezoneFallback();
      offset = val.offset;
      label = val.label;
    }
    await persistance.create(
      {
        offset,
        date: new Date(Date.UTC(1970, 0, 1)).toISOString(),
        label: label ?? ""
      },
      Resource.tz
    );
    return this._setTimezone(offset, label);
  }
  onBoardingStatusCheck() {
    if (this.resolveUiState(UIState.isOnboardingComplete)) return true;
    else {
      appStore.gotoPath("/onboarding");
      return false;
    }
  }
  resolveUiState(property: string) {
    const uiStates = get(userPreferences).uiStates;
    let value = undefined;
    if (get(view).isPortrait) {
      //@ts-ignore
      value = uiStates?.portrait[property];
    } else {
      //@ts-ignore
      value = uiStates?.desktop[property];
    }
    if (value === undefined) {
      //@ts-ignore
      value = uiStates?.all[property];
    }
    return value;
  }
  setUiState({ property, value, isGlobal }: UIStateProps) {
    const uiStates = get(userPreferences).uiStates;
    if (!uiStates) return;
    if (isGlobal) {
      //@ts-ignore
      uiStates.all[property] = value;
    } else if (get(view).isPortrait) {
      //@ts-ignore
      uiStates.portrait[property] = value;
    } else {
      //@ts-ignore
      uiStates.desktop[property] = value;
    }
    this.modify({ uiStates });
  }
}

export const userPreferences = new UserPreferencesStore();

const cachedAppData = retrieveLocally(Resource.appData);

export const appStore = initAppStore({
  product: "tidy",
  env: "dev",
  isDebugMode,
  isExperimentalMode,
  appData: cachedAppData ?? defaultAppData,
  currentPath: "",
  isMenuHidden: false,
  actions: []
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
    // console.log({ method: "gotoPath", path });
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
    gotoPath("/error");
  };
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
    if (action.type === ActionType.LINK) {
      const url = get(appStore).appData.urls[action.action];
      if (!url) return;
      if (url) return openLink(url);
    } else if (action.type === ActionType.FUNCTION) {
      if (!action.fn) return;
      return action.fn(params?.componentParams);
    } else if (action.type === ActionType.CONFIRMATION && action.confirmation) {
      confirmationNotification.notify(action.confirmation);
    } else if (params.isReturnIfComponent) {
      return action;
    } else if (action.type === ActionType.MODAL) {
      modalEvent.notify({
        path: action.action,
        isShow: true,
        componentParams: params?.componentParams,
        ...action.modalParams
      });
    } else if (action.component) {
      console.log("running action", { action });
      gotoPath("/" + (action.path ?? action.action));
      return;
    }
  };
  const openLink = (url: string) => {
    console.log("opening link", url);
    const ctx = get(context);
    if (!url) return;
    if (!url.includes("http")) {
      gotoPath(url);
      return;
    }
    if (ctx.isEmbed) {
      postToParent({
        link: url
      });
    } else {
      let win = window?.open(url, "_blank");
      if (win) {
        win.focus();
      }
    }
  };

  const initiateOAuth2Flow = (provider: IdentityProvider) => {
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
      ? import.meta.env?.VITE_OAUTH_REDIRECT ?? "https://" + host
      : window.location.origin;
    // const origin = window.location.origin;
    const guestPartForState = localStorage.getItem("guest") ?? "";
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
      domainPartForState;
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
      openLink(url);
    } else {
      goto(url);
    }
  };

  function runClientUpdate() {
    console.log("running client update");
    //todo - show user a message that an update is available - auto updating for now
    window?.location?.reload();
  }

  const checkForUpdates = async () => {
    let latestVersion = get(appStore).appData?.version;
    try {
      if (!latestVersion) {
        latestVersion = await new Persistence().getLatestAppVersion();
      }
      if (!latestVersion) return;
      const appVersionOnClient = localStorage.getItem("appVersion");
      if (!appVersionOnClient) {
        localStorage.setItem("appVersion", latestVersion);
        await dboVersion.runDboUpdate();
        return true;
      } else if (appVersionOnClient != latestVersion) {
        localStorage.setItem("appVersion", latestVersion);
        runClientUpdate();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

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
        ResourceAccessMode.FOCUS
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
        ResourceAccessMode.FOCUS
      ) === id
    )
      return ResourceAccessMode.FOCUS;
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
    id: string
  ): ResourceAccessMode => {
    const searchParams = new URLSearchParams(window.location.search);

    const mode = (Object.values(ResourceAccessMode) as string[]).find(
      (m) => m !== ResourceAccessMode.INLINE && searchParams.get(m) === id
    );

    return (mode as ResourceAccessMode) || ResourceAccessMode.INLINE;
  };

  const determineClickAccessMode = (event: MouseEvent) => {
    //TODO - shortcuts from user settings
    if (event.shiftKey) return ResourceAccessMode.FOCUS;
    else if (event.altKey) {
      const isFromFocusOrPop = isFSplit();
      if (isFromFocusOrPop) return ResourceAccessMode.FSPLIT;
      else return ResourceAccessMode.SPLIT;
    } else if (event.metaKey) {
      // TODO - open in new tab?
    }
  };
  const resourceClickHandler = (
    event: MouseEvent,
    id: string,
    defaultTo: ResourceAccessMode = ResourceAccessMode.INLINE
  ) => {
    if (!id) return;
    accessLogStore.create(
      {
        resource: id.split(":")[0],
        action: ResourceActionType.OPEN,
        resourceId: id,
        timestamp: new Date().toISOString()
      },
      {
        queueParams: {
          isUseQueueFirstApproach: true,
          mutationId: `${id}-accessLog-create`
        }
      }
    );
    toggleSearchParam("view");
    const accessMode = determineClickAccessMode(event);
    if (accessMode) toggleSearchParam(accessMode, id);
    else toggleSearchParam(defaultTo, id);
    // console.log("resourceClickHandler", { id, defaultTo, event });
  };
  const resourceClickHandlerWithReplace = (
    event: MouseEvent,
    id: string,
    replaceId: string
  ) => {
    const currentAccessMode = determineCurrentResourceAccessMode(replaceId);
    resourceClickHandler(event, id, currentAccessMode);
  };
  const closeResource = (isCloseAllModal: boolean = false) => {
    if (isCloseAllModal) {
      toggleSearchParam(ResourceAccessMode.FSPLIT);
      debouncer(toggleSearchParam, 100)(ResourceAccessMode.POP);
      return;
    }
    toggleSearchParam(ResourceAccessMode.SPLIT);
    toggleSearchParam(ResourceAccessMode.FOCUS);
    toggleSearchParam(ResourceAccessMode.POP);
    toggleSearchParam(ResourceAccessMode.FSPLIT);
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
    loadAppData(appData: any) {
      update((n: AppStore) => {
        n.appData = appData;
        persistLocally(Resource.appData, appData);
        return n;
      });
    },
    turnDebugMode(isDebugMode: boolean) {
      update((n: AppStore) => {
        n.isDebugMode = isDebugMode;
        return n;
      });
    },

    showMiniPlayer(path: string, params: any = null) {
      update((n: AppStore) => {
        n.player = path;
        //n.playerParams = params;
        return n;
      });
    },
    togglePip(path: string) {
      update((n: AppStore) => {
        if (!n.player) n.player = path;
        n.isPipOn = !n.isPipOn;
        return n;
      });
    },
    hideMiniPlayer() {
      update((n: AppStore) => {
        n.player = undefined;
        return n;
      });
    },
    showFullScreenPlayer(path: string) {
      update((n: AppStore) => {
        n.fullScreenComponentPath = path;
        runAction(path);
        n.player = undefined;
        return n;
      });
    },
    hideFullScreenPlayer(isHideMiniPlayer: boolean = false) {
      update((n: AppStore) => {
        if (n.fullScreenComponentPath && !isHideMiniPlayer)
          n.player = resolveComponentFromPath(
            n.fullScreenComponentPath
          )?.associatedPlayer;
        else if (isHideMiniPlayer) n.player = undefined;
        modalEvent.hideSpecific(n.fullScreenComponentPath ?? "", "app.store");
        n.fullScreenComponentPath = undefined;
        return n;
      });
    },
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
    toggleSidebar() {
      const val = userPreferences.resolveUiState(UIState.isInThinMode);
      userPreferences.setUiState({
        property: UIState.isInThinMode,
        value: !val
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
    checkForUpdates,
    toggleSearchParam,
    resourceClickHandler,
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

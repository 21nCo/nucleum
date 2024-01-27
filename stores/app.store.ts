import type { WindowObject } from "$lib/tidy/types/windowObject.type";
import { get, readable, writable } from "svelte/store";
import {
  generateUID,
  performApiCall,
  resolveComponentFromPath
} from "$lib/tidy/utils/utils";
import { AppTheme, type ColorSchemeSLValues } from "$lib/tidy/types/theme.type";
import {
  LaunchContext,
  type AppStore,
  EmbedContext
} from "$lib/tidy/types/appStore.type";
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type";
import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
import type { UserGlobalPreferences } from "$lib/tidy/types/preferences.type";
import { AppEvent } from "../types/event.enum";
import type { AppEventType } from "../types/event.type";
import { Cloud } from "../types/cloud.enum";
import blankJson from "$lib/tidy/data/blank.json";
import colorSchemes from "$lib/tidy/theme/colorschemes.json";
import type { UserAccount, UserInformation } from "../types/account.type";
import { goto } from "$app/navigation";
import type { ModalEvent } from "../types/popup.type";
import { Persistance, persistLocally, retrieveLocally } from "./persistance";
import { objIsEmpty, shallowDiff } from "../utils/obj.utils";
import { detectTimeZone, offsetInSeconds } from "../utils/time.utils";
import { Item } from "$lib/tidy/types/item.enum";
import { defaultAppData } from "$lib/local/stores/local.store";
import { TimeScale } from "../types/time.type";
import { postMessageToParent, postToParent } from "../utils/embed.utils";
import type {
  ConfirmationNotification,
  ScheduledNotification,
  Toast
} from "../types/notification.type";
import { EmbedMessage } from "../types/embedMessage.enum";
import { ButtonVariant } from "../types/button.type";
import type {
  DailyData,
  MonthlyData,
  YearlyData
} from "../types/CalendarHeatMapData.type";
import { CalendarLayout } from "../types/CalendarHeatMap.enum";

export const appEvents = initEventStore({ event: AppEvent.NONE, value: false });
export const currentTime = writable<Date>(new Date());
export const cloudProvider = writable(Cloud.surreal);
export const isRefreshingToken = writable(false);
export const isAppInLoadingState = writable(true);
export const isTouchDevice = writable(false);
export const CalendarHeatMapData = writable<{
  data: any;
  target: number;
}>({ data: [], target: 0 });
export const CalendarHeatMapLayout = writable<
  CalendarLayout.VERTICAL | CalendarLayout.HORIZONTAL
>(CalendarLayout.HORIZONTAL);
export const CalendarHeatMapstoreColors = readable<string[]>([
  "#D8E4D8",
  "#B2CAB1",
  "#9FBD9D",
  "#79A376",
  "#5B8958",
  "#407C3C"
]);
export const excludedPathsForRedirectionCheck = [
  "expired",
  "signup",
  "login",
  "404",
  "onboarding",
  "error",
  "welcome",
  "play",
  "r"
];

let persistance = new Persistance();

let blankDetails: any = blankJson.find(
  (subatom: any) => subatom.url == "blank.coop"
);
export const blank = writable(blankDetails);

function initEventStore(seed: AppEventType) {
  const { subscribe, set, update } = writable<AppEventType>(seed);
  return {
    subscribe,
    set: (m: AppEventType) => {
      set(m);
    },
    publish: (m: AppEvent, value: any = undefined) => {
      update((n: AppEventType) => {
        return { ...n, value, event: m };
      });
    }
  };
}

export const windowObject = initWindow({
  documentHeight: 0,
  documentWidth: 0,
  landscapiness: 0,
  scale: 0,
  isInPortraitMode: false,
  firstLoad: new Date().getTime(),
  currentPath: "",
  isMenuHidden: false
});

function checkIfNeedToHideMenu(newPath: string, n: WindowObject) {
  const path = newPath.split("?")[0];
  if (path.split("/")[1]) {
    let component = resolveComponentFromPath(path.split("/")[1]);
    if (component?.isMenuHidden) return true;
  }
  const listOfPathsToHideMenu = {
    portrait: ["/goals/*", "/cp/*"],
    landscape: []
  };
  if (!path) return false;
  let pathParts = path.split("/").filter((p) => p);
  if (n.isInPortraitMode) {
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
}

function initWindow(settings: WindowObject) {
  const { subscribe, set, update } = writable<WindowObject>(settings);
  return {
    subscribe,
    set,
    reset: (windowObject: WindowObject) => {
      set(windowObject);
    },
    updateDoumentDimensions: (width: number, height: number) => {
      update((n: WindowObject) => {
        n = {
          ...n,
          documentHeight: height,
          documentWidth: width,
          landscapiness: width / height,
          scale: (width / 1000 + height / 1000) / 2,
          isInPortraitMode: false
        };
        n.isInPortraitMode = n.landscapiness < 1;
        return n;
      });
    },
    toggleMenuVisibility: (isHidden?: boolean) => {
      update((n: WindowObject) => {
        if (isHidden !== undefined && isHidden !== null) {
          n = { ...n, isMenuHidden: isHidden };
        } else {
          n = { ...n, isMenuHidden: !n.isMenuHidden };
        }
        return n;
      });
    },
    toggleTopBar: (isMinimal: boolean) => {
      update((n: WindowObject) => {
        n = { ...n, isMinimalTopBar: isMinimal };
        return n;
      });
    },
    setCurrentPath: (path: string) => {
      update((n: WindowObject) => {
        n = {
          ...n,
          currentPath: path,
          isMenuHidden: checkIfNeedToHideMenu(path, n)
        };
        return n;
      });
    },
    gotoPath: async (path: string, params: any = null) => {
      appStore.log({ method: "gotoPath", path });
      update((n: WindowObject) => {
        n = {
          ...n,
          currentPath: path,
          isMenuHidden: checkIfNeedToHideMenu(path, n)
        };
        return n;
      });
      if (!navigator.onLine) {
        path = "/offline";
      }
      if (params) goto(path, params);
      else goto(path);
    }
  };
}

export const dragAndDropStore = createDragAndDropStore();

function createDragAndDropStore() {
  const { subscribe, set, update } = writable<DragAndDrop>({
    dragItem: {},
    dropItem: {},
    dragEnterItem: {},
    dragStatus: DragStatus.NONE,
    dragId: "",
    dragEnterId: "",
    dropId: "",
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
        dragStatus: DragStatus.NONE,
        dragId: "",
        dragEnterId: "",
        dropId: "",
      });
    },
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

const selectableColorParams: ColorSchemeSLValues[] = [
  {
    saturation: 55,
    lightness: 65,
    colorScheme: "colorscheme:solarizeddark"
  }
];

const isDebugMode =
  import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true";
const isExperimentalMode =
  import.meta.env.DEV && import.meta.env.VITE_ISEXPERIMENTAL === "true";

const isDebugEmbedMode = import.meta.env.VITE_IS_DEBUG_EMBED === "true";

let themes = [AppTheme.Clean, AppTheme.Glassy];
if (isDebugMode)
  themes = themes.concat([AppTheme.Vibrant, AppTheme.Futuristic]);

export const appStore = initAppStore({
  isDebugMode,
  isExperimentalMode,
  isDebugEmbedMode,
  launchContext: LaunchContext.DEFAULT,
  embedContext: EmbedContext.NONE,
  appData: defaultAppData,
  appConstants: {
    themes,
    colorSchemes,
    tempColorSchemes,
    colorSchemeSLConfig: selectableColorParams
  }
});

function initAppStore(seed: AppStore) {
  const { subscribe, set, update } = writable<AppStore>(seed);
  return {
    subscribe,
    set: (m: AppStore) => {
      set(m);
    },
    update,
    initiatizeAppData(appData: any) {
      update((n: AppStore) => {
        n.appData = appData;
        return n;
      });
    },
    turnDebugMode(isDebugMode: boolean) {
      update((n: AppStore) => {
        n.isDebugMode = isDebugMode;
        return n;
      });
    },
    log(message: string | object, type: "error" | "info" | "warn" = "info") {
      update((n: AppStore) => {
        (n.isDebugMode || n.isDebugEmbedMode) && console.log(message);
        if (!n.debugLogs) n.debugLogs = [];
        n.debugLogs.push({
          message:
            typeof message === "string" ? message : JSON.stringify(message),
          type,
          timestamp: new Date().toLocaleTimeString()
        });
        return n;
      });
    },
    logError(message: any) {
      update((n: AppStore) => {
        if (!n.debugLogs) n.debugLogs = [];
        n.debugLogs.push({
          message,
          type: "error",
          timestamp: new Date().toLocaleTimeString()
        });
        if (n.isDebugEmbedMode) {
          postToParent({
            error: message
          });
        }
        return n;
      });
    },
    clearDebugLogs() {
      update((n: AppStore) => {
        n.debugLogs = [];
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
        n.player = undefined;
        return n;
      });
    },
    hideFullScreenPlayer(isHideMiniPlayer: boolean = false) {
      update((n: AppStore) => {
        if (n.fullScreenComponentPath && !isHideMiniPlayer)
          n.player = resolveComponentFromPath(n.fullScreenComponentPath)
            ?.associatedPlayer;
        else if (isHideMiniPlayer) n.player = undefined;
        n.fullScreenComponentPath = undefined;
        return n;
      });
    }
  };
}

const userPreferencesId = "Preferences:global";
const locallySyncedTailwindTheme = retrieveLocally(Item.TailwindTheme);
export const tailwindTheme = writable<string>(
  locallySyncedTailwindTheme || "clean cs_tidigit_light_blue"
);
const defaultColorSchemeId = "colorscheme:cleantidylightblue";

const seedUserPreferences: UserGlobalPreferences = {
  id: userPreferencesId,
  nickName: "",
  dayStartHour: 0,
  dayStartMinute: 0,
  birthday: new Date(),
  tempColorScheme: "scheme1",
  accessibilitySizingFactor: 1,
  timeScales: [TimeScale.DAYS, TimeScale.MONTHS, TimeScale.YEARS],
  timeFormat: "meridian",
  timeZoneOffset: offsetInSeconds(detectTimeZone().offset),
  isAnonymousAnalyticsEnabled: true,
  colorScheme:
    colorSchemes.find((cs) => cs.id == defaultColorSchemeId) ?? colorSchemes[0],
  theme: AppTheme.Clean,
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
  }
};

const locallySyncedUserPreferences = retrieveLocally(Item.UserPreferences);
export const userPreferences = initUserPreferences(
  locallySyncedUserPreferences || seedUserPreferences
);

function initUserPreferences(initialValue: UserGlobalPreferences) {
  let previousValue: string;
  const { subscribe, set: setRaw } =
    writable<UserGlobalPreferences>(initialValue);
  const persist = (n: Partial<UserGlobalPreferences>) => {
    //console.log("persisting global preferences", { n });
    persistance.update({ ...n, id: userPreferencesId });
    persistLocally(Item.UserPreferences, get(userPreferences));
  };
  const set = (x: UserGlobalPreferences) => {
    setRaw(x);
    previousValue = JSON.stringify(x);
  };
  return {
    subscribe,
    loadFromCloud: (data: UserGlobalPreferences) => {
      if (!data.uiStates) data.uiStates = seedUserPreferences.uiStates;
      if (data.isAnonymousAnalyticsEnabled === undefined)
        data.isAnonymousAnalyticsEnabled = true;
      set(data);
      persistLocally(Item.UserPreferences, data);
    },
    loadSeedData: () => {
      set(seedUserPreferences);
      persist(seedUserPreferences);
    },
    set: (newValue: UserGlobalPreferences) => {
      let changedProperties: any = {};
      if (previousValue) {
        let differences = shallowDiff(newValue, JSON.parse(previousValue));
        differences.forEach((key: string) => {
          changedProperties[key] = newValue[key as keyof UserGlobalPreferences];
        });
      }
      // console.log({
      //   previousValue: previousValue ? JSON.parse(previousValue) : null,
      //   newValue,
      //   changedProperties,
      // });
      set(newValue);
      if (!objIsEmpty(changedProperties)) persist(changedProperties);
    },
    setTheme: (theme: AppTheme, colorScheme: string) => {
      const colorSchemes = get(appStore).appConstants.colorSchemes;
      let cs = colorSchemes.find((cs) => cs.id == colorScheme);
      if (!cs) cs = colorSchemes[0];
      console.log("setting theme", { theme, cs });
      set({
        ...get(userPreferences),
        theme,
        colorScheme: cs
      });
    }
  };
}

export const account = initAccount({
  isLoggedIn: false,
  token: null
});

function initAccount(seed: UserAccount) {
  if (localStorage.getItem("surreal-token")) {
    seed.token = localStorage.getItem("surreal-token");
    seed.isLoggedIn = true;
  }
  if (localStorage.getItem("userInfo")) {
    seed.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
  }
  postToParent({
    account: JSON.stringify({
      userId: seed.userInfo?.id.split("user:")[1],
      token: seed.token,
      isLoggedIn: true
    })
  });
  const { subscribe, set, update } = writable<UserAccount>(seed);
  const addSeedUserInfo = (n: UserAccount) => {
    let seedUserInfo = {
      email: "john.legend@gmail.com",
      phone: "",
      nickName: "",
      joinDate: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 200),
      lastLogin: new Date(),
      profilePicture: "",
      id: ""
    };
    n.userInfo = seedUserInfo;
    return n;
  };
  const signin = async (
    data: {
      userInfo: UserInformation;
      token: string;
      refreshToken: string;
    },
    params: {
      isIgnoreRefresh?: boolean;
      isFromSignup?: boolean;
    } = { isIgnoreRefresh: false, isFromSignup: false }
  ) => {
    console.log("signing in", { data });
    localStorage.setItem("surreal-token", data.token);
    localStorage.setItem("refresh-token", data.refreshToken);
    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
    // isOnboardingComplete.check();
    postToParent({
      account: JSON.stringify({
        userId: data.userInfo.id.split("user:")[1],
        token: data.token,
        refreshToken: data.refreshToken,
        isLoggedIn: true
      })
    });
    update(() => {
      return {
        token: data.token,
        isLoggedIn: true,
        userId: data.userInfo.id,
        userInfo: data.userInfo
      };
    });
    if (!params.isIgnoreRefresh && !params.isFromSignup) {
      appEvents.publish(AppEvent.USER_LOGIN, true);
      windowObject.gotoPath("/");
    } else if (params.isFromSignup) {
      appEvents.publish(AppEvent.USER_SIGNUP, true);
      windowObject.gotoPath("/onboarding");
    } else if (!params.isFromSignup) {
      windowObject.gotoPath("/");
    }
  };
  const expire = () => {
    // localStorage.removeItem("surreal-token");
    // localStorage.removeItem("userInfo");
    update(() => {
      const n = { token: null, isLoggedIn: false };
      return n;
    });
    appEvents.publish(AppEvent.USER_LOGIN, false);
    postToParent({
      account: JSON.stringify({
        isLoggedIn: false
      })
    });
  };
  return {
    subscribe,
    set,
    signOut: () => {
      expire();
      localStorage.removeItem("surreal-token");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("isOnboardingComplete");
      windowObject.gotoPath("/signup?msg=signedout");
    },
    signIn: signin,
    expire,
    embedOAuthSignin: async (token: string, isSignup: boolean) => {
      localStorage.setItem("surreal-token", token);
      let response = await new Persistance().getUserInfo(token);
      if (response?.userInfo) {
        await signin(
          {
            userInfo: response?.userInfo,
            token: token,
            refreshToken: token
          },
          { isFromSignup: isSignup }
        );
      } else {
        console.log("error", response);
      }
    },
    delete: () => {
      //todo - delete account
      confirmationNotification.notify({
        title: "Account deletion confirmation",
        message: "Are you sure you want to delete your account?",
        confirmAction: {
          label: "Delete",
          variant: ButtonVariant.DANGER,
          callback: () => {
            account.confirmDelete();
          }
        }
      });
    },
    confirmDelete: async () => {
      let acc = get(account);
      await performApiCall("account/delete", "POST", { id: acc.userId });
      console.log("deleting account", { acc });
      account.signOut();
      windowObject.gotoPath("/signup?msg=deleted");
    }
  };
}

const defaultModal = {
  path: "",
  id: "",
  isShow: false
};
export const modalEvent = initModalStore(defaultModal);

function initModalStore(seed: ModalEvent) {
  const { subscribe, set, update } = writable<ModalEvent>(seed);
  return {
    subscribe,
    set: (m: ModalEvent) => {
      set(m);
    },
    reset: () => {
      update((n: ModalEvent) => {
        return defaultModal;
      });
    },
    hide: () => {
      const modal = get(modalEvent);
      if (modal.isDismissable === false) return;
      update((n: ModalEvent) => {
        return { ...n, isShow: false };
      });
    },
    notify: (event: ModalEvent) => {
      update((n: ModalEvent) => {
        return { ...event };
      });
    }
  };
}

export const scheduledNotifications = initScheduledNotificationStore();

function initScheduledNotificationStore() {
  const { subscribe, set, update } = writable<ScheduledNotification[]>([]);
  return {
    subscribe,
    set: (m: ScheduledNotification[]) => {
      set(m);
    },
    reset: () => {
      update(() => {
        return [];
      });
      postMessageToParent(EmbedMessage.CLEAR_NOTIFICATIONS);
    },
    notify: (event: ScheduledNotification[]) => {
      update((n: ScheduledNotification[]) => {
        return event;
      });
    },
    push: (event: ScheduledNotification) => {
      update((n: ScheduledNotification[]) => {
        n.push(event);
        return n;
      });
    }
  };
}

export const toasts = initToastStore();

function initToastStore() {
  let timer: any;
  const { subscribe, set, update } = writable<Toast[]>([]);
  return {
    subscribe,
    set: (m: Toast[]) => {
      set(m);
    },
    reset: () => {
      clearTimeout(timer);
      update(() => {
        return [];
      });
    },
    trigger: (event: Toast) => {
      console.log("triggering toast", event);
      update((n: Toast[]) => {
        if (n.length > 3) n.shift();
        n.push(event);
        return n;
      });
      if (get(windowObject).isInPortraitMode) {
        modalEvent.notify({
          path: "STATUS_UPDATE",
          id: event.id,
          isShow: true,
          isDismissable: false
        });
      } else {
        timer = setTimeout(() => {
          update((n: Toast[]) => {
            n.shift();
            return n;
          });
        }, 5000);
      }
    }
  };
}

export const confirmationNotification = initConfirmationStore();

function initConfirmationStore() {
  const { subscribe, set, update } = writable<
    ConfirmationNotification | undefined
  >(undefined);
  return {
    subscribe,
    set: (m: any) => {
      set(m);
    },
    reset: () => {
      setTimeout(() => {
        update(() => {
          return undefined;
        });
      }, 100);
    },
    notify: (event: ConfirmationNotification) => {
      update(() => {
        return { ...event };
      });
    }
  };
}
export const fullPageLoadingScreen = initFullPageLoadingScreen();

function initFullPageLoadingScreen() {
  const { subscribe, set, update } = writable<{
    isShow: boolean;
    text: string;
  }>({ isShow: false, text: "loading..." });
  return {
    subscribe,
    set: (m: any) => {
      set(m);
    },
    reset: () => {
      update(() => {
        return { isShow: false, text: "loading..." };
      });
    },
    show: (text: string) => {
      update(() => {
        return { isShow: true, text };
      });
    },
    hide: () => {
      update(() => {
        return { isShow: false, text: "loading..." };
      });
    }
  };
}

export const isInEditMode = initEditModeStore();

function initEditModeStore() {
  const { subscribe, update } = writable<boolean>(false);
  return {
    subscribe,
    toggle: () => {
      update((n: boolean) => {
        return !n;
      });
    }
  };
}

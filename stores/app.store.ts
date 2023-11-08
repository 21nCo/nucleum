import type { WindowObject } from "$lib/tidy/types/windowObject.type";
import { writable } from "svelte/store";
import { generateUID, resolveComponentFromPath } from "$lib/tidy/utils/utils";
import {
  AppTheme,
  type selectableColorParams,
} from "$lib/tidy/types/theme.type";
import { LaunchContext, type AppStore } from "$lib/tidy/types/appStore.type";
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type";
import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
import type { UserGlobalPreferences } from "$lib/tidy/types/preferences.type";
import { AppEvent } from "../types/event.enum";
import type { AppEventType } from "../types/event.type";
import { Cloud } from "../types/cloud.enum";
import blankJson from "$lib/tidy/data/blank.json";
import type { UserAccount, UserInformation } from "../types/account.type";
import { goto } from "$app/navigation";
import type { ModalEvent } from "../types/popup.type";
import type { HapticFeedback } from "../types/haptic.enum";
import { sessionStore } from "$lib/local/stores/session.store";
import { Persistance } from "./persistance";
import { objIsEmpty, shallowDiff } from "../utils/obj.utils";
import { detectTimeZone } from "../utils/time.utils";

export const appEvents = initEventStore({ event: AppEvent.NONE, value: false });
export const currentTime = writable<Date>(new Date());
export const cloudProvider = writable(Cloud.surreal);

export const isRefreshingToken = writable(false);

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
    },
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
  isMenuHidden: false,
});

function checkIfNeedToHideMenu(newPath: string, n: WindowObject) {
  if (newPath.split("/")[1]) {
    let component = resolveComponentFromPath(newPath.split("/")[1]);
    if (component?.isMenuHidden) return true;
  }
  const listOfPathsToHideMenu = {
    portrait: ["/goals/*", "/cp/*"],
    landscape: [],
  };
  if (!newPath) return false;
  let pathParts = newPath.split("/").filter((p) => p);
  if (n.isInPortraitMode) {
    if (listOfPathsToHideMenu.portrait.includes(newPath)) return true;
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
          isInPortraitMode: false,
        };
        n.isInPortraitMode = n.landscapiness < 1;
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
          isMenuHidden: checkIfNeedToHideMenu(path, n),
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
          isMenuHidden: checkIfNeedToHideMenu(path, n),
        };
        return n;
      });
      if (!navigator.onLine) {
        path = "/offline";
      }
      if (params) goto(path, params);
      else goto(path);
    },
  };
}

export const dragAndDropStore = writable<DragAndDrop>({
  dragItem: {},
  dropItem: {},
  dragEnterItem: {},
  dragStatus: DragStatus.NONE,
  listId: "",
});

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
  "scheme11",
];

//HSL - dark: x, 30, 50   light: x, 60, 70
const selectableColors = [
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#85dde0", lightHex: "#59a3a6" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
  { id: generateUID(), darkHex: "#97f7b1", lightHex: "#65a877" },
];

const selectableColorParams: selectableColorParams = {
  darkSaturation: 60,
  darkLightness: 70,
  lightSaturation: 30,
  lightLightness: 50,
};

const isDebugMode =
  import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true";

let themes = [AppTheme.Clean, AppTheme.Glassy];
if (isDebugMode)
  themes = themes.concat([AppTheme.Vibrant, AppTheme.Futuristic]);

export const appStore = initAppStore({
  isDebugMode,
  launchContext: LaunchContext.DEFAULT,
  tailwindTheme: "",
  appData: {},
  appConstants: {
    themes,
    colorSchemes: [],
    tempColorSchemes,
    selectableColorParams,
  },
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
        n.appConstants.colorSchemes = appData.colorschemes;
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
        n.isDebugMode && console.log(message);
        if (!n.debugLogs) n.debugLogs = [];
        n.debugLogs.push({
          message:
            typeof message === "string" ? message : JSON.stringify(message),
          type,
          timestamp: new Date().toLocaleTimeString(),
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
          timestamp: new Date().toLocaleTimeString(),
        });
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
          n.player = resolveComponentFromPath(
            n.fullScreenComponentPath
          )?.associatedPlayer;
        else if (isHideMiniPlayer) n.player = undefined;
        n.fullScreenComponentPath = undefined;
        return n;
      });
    },
  };
}

export const defaultColors = {
  bgs1: "hsl(0 0% 100%)",
  bgs2: "hsl(0 0% 98%)",
  bgs3: "hsl(0 0% 92%)",
  bgs4: "hsl(0 0% 88%)",
  bgs5: "hsl(0 0% 85%)",
  fgs1: "hsl(0 0% 20%)",
  fgs2: "hsl(0 0% 33%)",
  fgs3: "hsl(0 0% 50%)",
  fgs4: "hsl(0 0% 65%)",
  a1: "hsl(354 72% 64%)",
  a2: "hsl(0 28% 55%)",
  ar: "hsl(0 89% 71%)",
  ag: "hsl(151 45% 53%)",
  a1s1: "hsl(354 80% 90%)",
  a1s2: "",
  a2s1: "",
  a2s2: "",
  brs1: "hsl(0 0% 97%)",
  brs2: "hsl(0 0% 95%)",
  brs3: "hsl(0 0% 90%)",
};

export const userPreferences = initUserPreferences({
  nickName: "",
  theme: AppTheme.Clean,
  dayStart: "00:00",
  birthday: new Date(),
  isOnboardingComplete: false,
  tempColorScheme: "scheme1",
  accessibilitySizingFactor: 1,
  timeFormat: "meridian",
  timeZone: detectTimeZone(),
  colorScheme: {
    label: "bw",
    theme: "clean",
    isDark: false,
    colors: defaultColors,
    tailwindSelector: "bw",
  },
});

function initUserPreferences(seed: UserGlobalPreferences) {
  let previousValue: string;
  const { subscribe, set, update } = writable<UserGlobalPreferences>(seed);
  const persist = (n: Partial<UserGlobalPreferences>) => {
    persistance.update({ id: "Preferences:global", ...n });
  };
  const retrieve = async () => {
    let m = await persistance.retrieve("Preferences:global");
    //console.log("retrieved global preferences", { m });
    if (m?.length > 0) {
      set(m[0]);
      previousValue = JSON.stringify(m[0]);
    } else {
      set(seed);
      persist(seed);
    }
  };
  return {
    subscribe,
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
      previousValue = JSON.stringify(newValue);
      if (!objIsEmpty(changedProperties)) persist(changedProperties);
    },
    sync: retrieve,
  };
}

export const account = initAccount({
  isLoggedIn: false,
  token: null,
});

function initAccount(seed: UserAccount) {
  if (localStorage.getItem("surreal-token")) {
    seed.token = localStorage.getItem("token");
    seed.isLoggedIn = true;
  }
  if (localStorage.getItem("userInfo")) {
    seed.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
  }
  const { subscribe, set, update } = writable<UserAccount>(seed);
  const addSeedUserInfo = (n: UserAccount) => {
    let seedUserInfo = {
      email: "john.legend@gmail.com",
      firstName: "John",
      lastName: "Legend",
      phone: "",
      joinDate: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 200),
      lastLogin: new Date(),
      profilePicture: "",
      id: "",
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
    isRefreshApp: boolean = false
  ) => {
    console.log("signing in", { data });
    localStorage.setItem("surreal-token", data.token);
    localStorage.setItem("refresh-token", data.refreshToken);
    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
    postMessageToParent({
      account: {
        userId: data.userInfo.id,
        token: data.token,
        refreshToken: data.refreshToken,
      },
    });
    if (isRefreshApp) {
      await userPreferences.sync();
      appEvents.publish(AppEvent.USER_LOGIN, true);
    }
    update((n: UserAccount) => {
      n = {
        token: data.token,
        isLoggedIn: true,
        userId: data.userInfo.id,
        userInfo: data.userInfo,
      };
      return n;
    });
  };
  const expire = () => {
    // localStorage.removeItem("surreal-token");
    // localStorage.removeItem("userInfo");
    update((n: UserAccount) => {
      n = { token: null, isLoggedIn: false };
      appEvents.publish(AppEvent.USER_LOGIN, false);
      return n;
    });
  };
  return {
    subscribe,
    set,
    signOut: () => {
      update((n: UserAccount) => {
        localStorage.removeItem("surreal-token");
        localStorage.removeItem("userInfo");
        n = { token: null, isLoggedIn: false };
        sessionStore.reset();
        appEvents.publish(AppEvent.USER_LOGIN, false);
        return n;
      });
    },
    signIn: signin,
    expire,
  };
}

export function postMessageToParent(message: any) {
  appStore.log("posting message to parent:" + JSON.stringify(message));
  try {
    window?.parent?.postMessage(message, "*");
  } catch (error) {
    appStore.logError(error);
  }
  try {
    //@ts-ignore
    window?.webkit?.messageHandlers?.iOSNative?.postMessage(message);
  } catch (error) {
    appStore.logError(error);
  }
}

const defaultModal = {
  path: "",
  id: "",
  isShow: false,
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
    notify: (event: ModalEvent) => {
      update((n: ModalEvent) => {
        return { ...n, ...event };
      });
    },
  };
}

export function hapticFeedback(haptic: HapticFeedback) {
  postMessageToParent({
    haptic,
  });
}

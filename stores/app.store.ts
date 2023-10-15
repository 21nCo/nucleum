import type { WindowObject } from "$lib/tidy/types/windowObject.type";
import { get, writable } from "svelte/store";
import {
  generateUID,
  getComponentFromPath,
  yesterday,
} from "$lib/tidy/utils/utils";
import type {
  ColorScheme,
  selectableColorParams,
} from "$lib/tidy/types/appConstants.type";
import { LaunchContext, type AppStore } from "$lib/tidy/types/appStore.type";
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type";
import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
import type { UserGlobalPreferences } from "$lib/tidy/types/preferences.type";
import { persistLocally, retrieveLocally } from "./persistance";
import { ItemType } from "$lib/local/types/item.enum";
import { EventType } from "../types/event.enum";
import type { CustomEvent } from "../types/event.type";
import { Cloud } from "../types/cloud.enum";
import blankJson from "$lib/tidy/data/blank.json";
import type { UserAccount } from "../types/account.type";
import { goto } from "$app/navigation";
import type { PopupEvent } from "../types/popup.type";

export const appEvents = initEventStore({ type: EventType.NONE, value: false });
export const currentTime = writable<Date>(new Date());
export const cloudProvider = writable(Cloud.surreal);

let blankDetails: any = blankJson.find(
  (subatom: any) => subatom.url == "blank.coop"
);
export const blank = writable(blankDetails);

function initEventStore(seed: CustomEvent) {
  const { subscribe, set, update } = writable<CustomEvent>(seed);
  return {
    subscribe,
    set: (m: CustomEvent) => {
      set(m);
    },
    publish: (m: EventType, value: any = undefined) => {
      update((n: CustomEvent) => {
        return { ...n, value, type: m };
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
  isHideMenu: false,
});

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
        n = { ...n, currentPath: path };
        return n;
      });
    },
    gotoPath: (path: string, params: any = null) => {
      update((n: WindowObject) => {
        console.log({ navigator });
        n = { ...n, currentPath: path };
        return n;
      });
      if (!navigator.onLine) {
        path = "offline";
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

let themes = ["Clean"];
if (isDebugMode) themes = themes.concat(["Colorful", "3026"]);

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
    setLaunchContext(launchContext: LaunchContext) {
      update((n: AppStore) => {
        n.launchContext = launchContext;
        return n;
      });
    },
    turnDebugMode(isDebugMode: boolean) {
      update((n: AppStore) => {
        n.isDebugMode = isDebugMode;
        return n;
      });
    },
    log(message: string, type: "error" | "info" | "warn" = "info") {
      update((n: AppStore) => {
        if (!n.debugLogs) n.debugLogs = [];
        n.debugLogs.push({
          message,
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
          n.player = getComponentFromPath(
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
  bgs1: "#FFFFFF",
  bgs2: "#F2F2F2",
  bgs3: "#E6E6E6",
  bgs4: "#D9D9D9",
  fgs1: "#383838",
  fgs2: "#545454",
  fgs3: "#757474",
  accent1: "#2d2f32",
  accent2: "#ad6c6c",
};

export const userPreferences = initUserPreferences({
  nickName: "",
  theme: "Clean",
  dayStart: "00:00",
  birthday: new Date(),
  isOnboardingComplete: false,
  tempColorScheme: "scheme1",
  accessibilitySizingFactor: 1,
  timeFormat: "meridian",
  colorScheme: {
    label: "bw",
    theme: "clean",
    isDark: false,
    colors: defaultColors,
  },
});

function initUserPreferences(seed: UserGlobalPreferences) {
  const objectType = ItemType.UserPreferences;
  let savedPreferences = retrieveLocally(objectType);
  const { subscribe, set, update } = writable<UserGlobalPreferences>(
    savedPreferences ?? seed
  );
  if (!savedPreferences) persistLocally(objectType, seed);
  return {
    subscribe,
    set: (m: UserGlobalPreferences) => {
      persistLocally(objectType, m);
      set(m);
    },
    reload: () => {
      let savedPreferences = retrieveLocally(objectType);
      set(savedPreferences);
    },
    updateDayStart: (m: string) => {
      update((n: UserGlobalPreferences) => {
        n = { ...n, dayStart: m };
        persistLocally(objectType, n);
        return n;
      });
    },
  };
}

export const isShowAppearancePreview = writable<boolean>(false);

export const account = initAccount({
  isLoggedIn: false,
  token: null,
});

function initAccount(seed: UserAccount) {
  if (localStorage.getItem("surreal-token")) {
    seed.token = localStorage.getItem("token");
    seed.isLoggedIn = true;
  }
  const { subscribe, set, update } = writable<UserAccount>(seed);
  return {
    subscribe,
    set,
    signOut: () => {
      update((n: UserAccount) => {
        localStorage.removeItem("surreal-token");
        n = { token: null, isLoggedIn: false };
        return n;
      });
    },
    signIn: (token: string) => {
      update((n: UserAccount) => {
        localStorage.setItem("surreal-token", token);
        n = { token, isLoggedIn: true };
        return n;
      });
    },
  };
}

export function postMessageToParent(message: any) {
  try {
    window?.parent?.postMessage(message, "*");
  } catch (error) {
    appStore.logError(error);
  }
  try {
    //@ts-ignore
    window?.webkit?.messageHandlers.iOSNative.postMessage(message);
    appStore.log("message sent to iOSNative" + JSON.stringify(message));
  } catch (error) {
    appStore.logError(error);
  }
}

const defaultPopup = {
  path: "",
  id: "",
  isShow: false,
};
export const popupEvent = initPopupEventStore(defaultPopup);

function initPopupEventStore(seed: PopupEvent) {
  const { subscribe, set, update } = writable<PopupEvent>(seed);
  return {
    subscribe,
    set: (m: PopupEvent) => {
      set(m);
    },
    reset: () => {
      update((n: PopupEvent) => {
        return defaultPopup;
      });
    },
    notify: (event: PopupEvent) => {
      update((n: PopupEvent) => {
        return { ...n, ...event };
      });
    },
  };
}

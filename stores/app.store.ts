import type { WindowObject } from "$lib/tidy/types/windowObject.type";
import { get, writable } from "svelte/store";
import { generateUID, yesterday } from "$lib/tidy/utils/utils";
import { colors } from "$lib/tidy/theme/colors";
import type {
  ColorScheme,
  selectableColorParams,
} from "$lib/tidy/types/appConstants.type";
import type { AppStore } from "$lib/tidy/types/appStore.type";
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type";
import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
import type { UserGlobalPreferences } from "$lib/tidy/types/preferences.type";
import { persistLocally, retrieveLocally } from "./persistance";
import { ItemType } from "../types/item.enum";
import { EventType } from "../types/event.enum";
import type { CustomEvent } from "../types/event.type";
import { Cloud } from "../types/cloud.enum";
import blankJson from "$lib/tidy/data/blank.json";
import type { UserAccount } from "../types/account.type";
import { goto } from "$app/navigation";

export const appEvents = initEventStore({ type: EventType.NONE, value: false });
export const currentTime = writable<Date>(new Date());
export const cloudProvider = writable(Cloud.local);

export const app =
  window.location.hostname === "localhost"
    ? import.meta.env.VITE_APP
    : window.location.hostname;

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
    gotoPath: (path: string, params: any = null) => {
      update((n: WindowObject) => {
        n = { ...n, currentPath: path };
        console.log({ n });
        return n;
      });
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

export const darkColorSchemes: ColorScheme[] = [
  { label: "dark", theme: "clean", isDark: true, ...colors.dark },
  { label: "dracula", theme: "clean", isDark: true, ...colors.dracula },
  { label: "forest", theme: "clean", isDark: true, ...colors.forest },
  { label: "sea", theme: "clean", isDark: true, ...colors.sea },
  { label: "dim", theme: "clean", isDark: true, ...colors.dim },
];

//{ label: "FBF8F1", isDark: false }
const lightColorSchemes: ColorScheme[] = [
  { label: "light", theme: "clean", isDark: false, ...colors.light },
  { label: "smoothy", theme: "clean", isDark: false, ...colors.smoothy },
  { label: "grainy", theme: "clean", isDark: false, ...colors.grainy },
  { label: "solarized", theme: "clean", isDark: false, ...colors.solarized },
];

const isDebugMode =
  import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true";

let themes = ["Clean"];
if (isDebugMode) themes = themes.concat(["Colorful", "3026"]);

export const appStore = initAppStore({
  isDebugMode,
  environment: "", //todo - move to base -> window?.location.host.split(".")[0],
  tailwindTheme: "",
  appData: {},
  appConstants: {
    themes,
    colorSchemes: [...darkColorSchemes, ...lightColorSchemes],
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
        return n;
      });
    },
    appendPlayer(path: string, params?: any) {
      update((n: AppStore) => {
        if (!path) return n;
        if (n.players?.find((p) => p.componentPath === path)) return n;
        if (n.players === undefined) n.players = [];
        n.players?.push({ componentPath: path, isShow: true, params });
        return n;
      });
    },
    removePlayer(path: string) {
      update((n: AppStore) => {
        if (!n.players) return n;
        let player = n.players?.find((p) => p.componentPath === path);
        if (!player) {
          return n;
        }
        n.players = n.players.filter((p) => p.componentPath !== path);
        return n;
      });
    },
  };
}

export const userPreferences = initUserPreferences({
  nickName: "",
  theme: "Clean",
  colorScheme: darkColorSchemes[4],
  dayStart: "00:00",
  birthday: new Date(),
  isOnboardingComplete: false,
  tempColorScheme: "scheme1",
  accessibilitySizingFactor: 1,
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

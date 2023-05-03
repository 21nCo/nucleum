import type { WindowObject } from "$lib/tidy/types/windowObject.type";
import { get, writable } from "svelte/store";
import { generateUID, yesterday } from "$lib/tidy/utils";
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

export const appEvents = initEventStore({ type: EventType.NONE, value: false });

function initEventStore(seed: CustomEvent) {
  const { subscribe, set, update } = writable<CustomEvent>(seed);
  return {
    subscribe,
    set: (m: CustomEvent) => {
      set(m);
    },
    notify: (m: EventType, value: any = undefined) => {
      update((n: CustomEvent) => {
        return { ...n, value, type: m };
      });
    },
  };
}

export const windowObject = initWindow({
  documentHeight: window.innerHeight,
  documentWidth: window.innerWidth,
  landscapiness: window.innerWidth / window.innerHeight,
  scale: window.innerWidth / 100,
  isInPortrait: false,
  isInThinMode: false,
  firstLoad: new Date().getTime(),
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
          isInThinMode: false,
        };
        n.isInPortrait = n.landscapiness < 1;
        n.isInThinMode = n.landscapiness < 0.75;
        return n;
      });
    },
    toggleTopBar: (isMinimal: boolean) => {
      update((n: WindowObject) => {
        n = { ...n, isMinimalTopBar: isMinimal };
        return n;
      });
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
//["light", "dark", "dracula", "dark-forest", "light-smooth", "light-grainy"]
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

const darkColorSchemes: ColorScheme[] = [
  { label: "dark", theme: "clean", isDark: true, ...colors.dark },
  { label: "dracula", theme: "clean", isDark: true, ...colors.dracula },
  { label: "forest", theme: "clean", isDark: true, ...colors.forest },
  { label: "sea", theme: "clean", isDark: true, ...colors.sea },
  { label: "dim", theme: "clean", isDark: true, ...colors.dim },
];

//{ label: "FBF8F1", isDark: false }
const lightColorSchemes: ColorScheme[] = [
  { label: "light", theme: "clean", isDark: false, ...colors.light },
  { label: "smooth", theme: "clean", isDark: false, ...colors.smooth },
  { label: "grainy", theme: "clean", isDark: false, ...colors.grainy },
];

const appMenu = [
  { label: "point", path: "/", icon: "point" },
  { label: "flow", path: "/flow", icon: "flow" },
  { label: "control", path: "/control", icon: "control" },
];

const isDebugMode =
  import.meta.env.DEV && import.meta.env.VITE_ISDEBUG === "true";

const themes = ["Clean"];
if (isDebugMode) themes.concat(["Colorful", "3026"]);

export const appStore = initAppStore({
  isDebugMode,
  environment: window?.location.host.split(".")[0],
  tailwindTheme: "clean light",
  appName: "Pointron",
  appConstants: {
    themes,
    colorSchemes: [...darkColorSchemes, ...lightColorSchemes],
    tempColorSchemes,
    selectableColorParams,
  },
  pages: appMenu,
});

function initAppStore(seed: AppStore) {
  const { subscribe, set, update } = writable<AppStore>(seed);
  return {
    subscribe,
    set: (m: AppStore) => {
      set(m);
    },
    update,
  };
}

export const userPreferences = initUserPreferences({
  nickName: "",
  theme: "Clean",
  colorScheme: lightColorSchemes[0],
  dayStart: "00:00",
  birthday: new Date(),
  isOnboardingComplete: false,
  tempColorScheme: "scheme1",
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

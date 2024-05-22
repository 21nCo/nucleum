import { get, readable, writable } from "svelte/store";
import {
  generateUID,
  resolveComponentFromPath,
  resolveUiState,
  runAction,
  setUiState
} from "$lib/tidy/utils/utils";
import {
  AppSkin,
  Theme,
  type ColorSchemeSLValues
} from "$lib/tidy/types/appearance.type";
import {
  LaunchContext,
  type AppStore,
  EmbedContext
} from "$lib/tidy/types/appStore.type";
import type { DragAndDrop } from "$lib/tidy/types/draganddrop.type";
import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
import type {
  UserAppearanceSettings,
  UserGlobalPreferences
} from "$lib/tidy/types/preferences.type";
import { Cloud } from "../types/cloud.enum";
import blankJson from "$lib/tidy/data/blank.json";
import colorSchemes from "$lib/tidy/theme/colorschemes.json";
import { Persistance, persistLocally, retrieveLocally } from "./persistance";
import { deepCopy, objIsEmpty, shallowDiff } from "../utils/obj.utils";
import { Item } from "$lib/tidy/types/item.enum";
import {
  defaultAppData,
  localCacheableStores
} from "$lib/local/stores/local.store";
import { TimeScale } from "../types/time.type";
import { Orientation } from "../types/direction.enum";
import { UiState } from "../types/uiState.enum";
import { emojis, materialSymbols, shuffleEmojis } from "../data/avatars";
import {
  PersistanceActionType,
  StoreDataType,
  type CacheableStore,
  type CacheableStoreContract
} from "../types/data.type";
import { dataManager } from "./data.store";
import modalEvent from "../components/modal/modal.store";
import { detectTimeZone } from "../utils/time.utils";

// export const app = writable<{ product: string; env: string }>({
//   product: "tidy",
//   env: "dev"
// });
// export const appEvents = initEventStore({ event: AppEvent.NONE, value: false });
export const currentTime = writable<Date>(new Date());
export const cloudProvider = writable(Cloud.surreal);
export const isRefreshingToken = writable(false);
export const appLoadingState = writable<{
  isBaseLoaded: boolean;
  isLocalLoaded: boolean;
}>({ isBaseLoaded: false, isLocalLoaded: false });
export const leftThresholdCrossedStore = writable("");
export const isTouchDevice = writable(false);

export const appStoreShuffleEmojis = writable(shuffleEmojis);
export const splitView = writable<string[]>([]);
export const intercomId = import.meta.env.VITE_INTERCOM_ID ?? "esh1m4xq";
export const selectedTimePeriod = writable<Date>(new Date());
export const plainCSSHMColorIndex5 = writable<string | undefined>("");
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
  "r",
  "fw",
  "ext-login"
];

let persistance = new Persistance();

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
    dragStatus: DragStatus.NONE,
    dragId: "",
    dragEnterId: "",
    dropId: ""
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
        dropId: ""
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

let themes = [AppSkin.Clean, AppSkin.Glassy];
if (isDebugMode) themes = themes.concat([AppSkin.Vibrant, AppSkin.Futuristic]);
export const appConstants = {
  themes,
  colorSchemes,
  tempColorSchemes,
  colorSchemeSLConfig: selectableColorParams
};
const seedDboVersion = {
  version: 0,
  id: Item.dboVersion,
  dataType: StoreDataType.KVO
};
const locallyPersistedDboVersion = retrieveLocally(Item.dboVersion);

export const dboVersion = initDboVersionStore();

function initDboVersionStore() {
  const { subscribe, set, update } = writable<dbVersionStore>(
    locallyPersistedDboVersion ?? seedDboVersion
  );
  dataManager.retrieveCache(seedDboVersion.id).then((x) => {
    if (x) set(x as dbVersionStore);
  });
  return {
    subscribe,
    set,
    loader: (data: any) => {
      console.log("loading db version", { data });
      const n = { ...seedDboVersion, ...data };
      set(n);
      persistLocally(Item.dboVersion, n);
      dataManager.cache(n);
    },
    setVersion: (version: number) => {
      console.log("setting db version", { version });
      update((n: dbVersionStore) => {
        n.version = version;
        persistLocally(Item.dboVersion, n);
        dataManager.cache(n);
        return n;
      });
    },
    update
  };
}

// const userPreferencesId = Item.globalPreferences;
const defaultColorSchemeId = "colorscheme:cleantidylightblue";
const defaultDarkColorSchemeId = "colorscheme:cleantidydarkblue";

export const seedUserPreferences: UserGlobalPreferences = {
  id: Item.globalPreferences,
  dataType: StoreDataType.KVO,
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
    theme: Theme.SYSTEM,
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
  annotations: []
};
const locallyPersistedPreferences = retrieveLocally(Item.globalPreferences);
type dbVersionStore = CacheableStore & {
  version: number;
};

export const userPreferences = initUserPreferences();

function initUserPreferences() {
  let previousValue: string;
  const {
    subscribe,
    set: setRaw,
    update
  } = writable<UserGlobalPreferences>(
    locallyPersistedPreferences ?? seedUserPreferences
  );
  dataManager.retrieveCache(Item.globalPreferences).then((x) => {
    if (x) {
      setRaw(x as UserGlobalPreferences);
      previousValue = JSON.stringify(x);
    }
  });
  const persist = (n: Partial<UserGlobalPreferences>) => {
    // console.log("persisting global preferences", { n });
    cache(get(userPreferences));
    persistLocally(Item.globalPreferences, get(userPreferences));
    // persistance.update({
    //   ...n,
    //   id: userPreferencesId
    // });
    dataManager.performMutation(
      Item.globalPreferences,
      {
        ...n,
        id: Item.globalPreferences
      },
      PersistanceActionType.MERGE
    );
  };
  const cache = async (n: UserGlobalPreferences) => {
    dataManager.cache(n);
  };
  const set = (x: UserGlobalPreferences) => {
    setRaw(x);
    previousValue = JSON.stringify(x);
  };
  return {
    subscribe,
    update,
    loader: (data: UserGlobalPreferences) => {
      if (!data.uiStates) data.uiStates = seedUserPreferences.uiStates;
      if (!data.avatarPicker)
        data.avatarPicker = seedUserPreferences.avatarPicker;
      if (!data.annotations) data.annotations = seedUserPreferences.annotations;
      if (data.isAnonymousAnalyticsEnabled === undefined)
        data.isAnonymousAnalyticsEnabled = true;
      if (!data.dataType) data.dataType = StoreDataType.KVO;
      const val = { ...data, id: Item.globalPreferences };
      set(val);
      cache(val);
    },
    loadSeedData: () => {
      set(seedUserPreferences);
      cache(seedUserPreferences);
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
    setUiStates: (uiStates: any) => {
      set({
        ...get(userPreferences),
        uiStates
      });
      persist({ uiStates });
    },
    setAppearance: (x: UserAppearanceSettings) => {
      update((n: UserGlobalPreferences) => {
        const appearance = { ...n.appearance, ...x };
        n.appearance = appearance;
        persist({ appearance });
        return n;
      });
    },
    setTimeZone: (offset?: number, label?: string) => {
      if (!offset) {
        offset = -new Date().getTimezoneOffset() * 60;
        label = detectTimeZone()?.label ?? "UTC";
      }
      console.log("setting time zone", { offset, label });
      update((n: UserGlobalPreferences) => {
        n.timeZoneOffset = offset;
        persist({ timeZoneOffset: offset, timeZoneLabel: label });
        persistance.create(
          { offset, date: new Date().toISOString(), label: label ?? "" },
          Item.tz
        );
        return n;
      });
    }
  };
}

const cachedAppData = retrieveLocally(Item.appData);

export const appStore = initAppStore({
  product: "tidy",
  env: "dev",
  isDebugMode,
  isExperimentalMode,
  launchContext: LaunchContext.DEFAULT,
  embedContext: EmbedContext.NONE,
  appData: cachedAppData ?? defaultAppData
});

function initAppStore(seed: AppStore) {
  const { subscribe, set, update } = writable<AppStore>(seed);
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
        persistLocally(Item.appData, appData);
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
      const userPref = get(userPreferences);
      const val = resolveUiState(userPref.uiStates, UiState.isInThinMode);
      console.log({ val, userPref });
      let newUiStates = setUiState(
        deepCopy(userPref.uiStates),
        UiState.isInThinMode,
        !val
      );
      userPreferences.setUiStates(newUiStates);
    }
  };
}

export const isInEditMode = initEditModeStore();

function initEditModeStore() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    set,
    toggle: () => {
      update((n: boolean) => {
        return !n;
      });
    }
  };
}
const cacheableStores: CacheableStoreContract[] = [userPreferences, dboVersion];
export const cacheableStoresTable = [
  ...localCacheableStores,
  ...cacheableStores
];

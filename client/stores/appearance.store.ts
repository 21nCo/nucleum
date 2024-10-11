import { get, writable } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  AppSkin,
  Theme,
  type AppearanceStore,
  type ColorScheme
} from "../types/appearance.type";
import colorSchemes from "$lib/client/theme/colorschemes.json";
import { StoreDataType } from "../types/data.type";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/persistence/persistence.utils";
import type { UserAppearanceSettings } from "../types/preferences.type";
import { dispatchCustomEvent } from "../utils/browser.utils";
import { GlobalEvent } from "../types/event.enum";

const defaultLightColorSchemeId = "colorscheme:clean_tidyblue_light";
const defaultDarkColorSchemeId = "colorscheme:clean_tidyblue_dark";
const seedAppearance: AppearanceStore = {
  id: Resource.appearance,
  dataType: StoreDataType.NA,
  skin: AppSkin.Clean,
  theme: Theme.LIGHT,
  isSyncWithSystem: true,
  userThemeSetting: Theme.LIGHT,
  systemTheme: Theme.LIGHT,
  accessibilitySizingFactor: 1,
  typeface:
    " Avenir, Teachers, Montserrat, Hanken Grotesk, Proxima Nova,  Poppins, Noto Sans, Nunito ",
  //BlinkMacSystemFont
  lightColorSchemeId: defaultLightColorSchemeId,
  darkColorSchemeId: defaultDarkColorSchemeId,
  colorScheme:
    colorSchemes.find((cs) => cs.id == defaultLightColorSchemeId) ??
    colorSchemes[0]
};
const cachedAppearance = retrieveLocally(
  Resource.appearance
) as AppearanceStore;
if (cachedAppearance) cachedAppearance.typeface = seedAppearance.typeface;
export const appearance = initAppearanceStore();

function initAppearanceStore() {
  const { subscribe, set, update } = writable<AppearanceStore>(
    cachedAppearance ?? seedAppearance
  );

  const cache = (store: AppearanceStore) => {
    persistLocally(Resource.appearance, store);
  };

  const persist = (store: AppearanceStore) => {
    dispatchCustomEvent(GlobalEvent.PERSIST_APPEARANCE_USER, {
      skin: store.skin,
      theme: store.theme,
      isSyncWithSystem: store.isSyncWithSystem,
      lightColorSchemeId: store.lightColorSchemeId,
      darkColorSchemeId: store.darkColorSchemeId
    });
    cache(store);
  };

  const switchTheme = (theme: Theme, a: AppearanceStore) => {
    let modified = { ...a, theme };
    if (theme === Theme.LIGHT) {
      if (!a.lightColorSchemeId && a.darkColorSchemeId) {
        a.lightColorSchemeId =
          colorSchemes.find((x) =>
            x.label.includes(a.darkColorSchemeId.split("_")[1])
          )?.id ?? defaultLightColorSchemeId;
      } else if (!a.lightColorSchemeId) {
        a.lightColorSchemeId = defaultLightColorSchemeId;
      }
      modified.colorScheme = colorSchemes.find(
        (cs) => cs.id == a.lightColorSchemeId
      ) as ColorScheme;
    }
    if (theme === Theme.DARK) {
      if (!a.darkColorSchemeId && a.lightColorSchemeId) {
        a.darkColorSchemeId =
          colorSchemes.find((x) =>
            x.label.includes(a.lightColorSchemeId.split("_")[1])
          )?.id ?? defaultDarkColorSchemeId;
      } else if (!a.darkColorSchemeId) {
        a.darkColorSchemeId = defaultDarkColorSchemeId;
      }
      modified.colorScheme = colorSchemes.find(
        (cs) => cs.id == a.darkColorSchemeId
      ) as ColorScheme;
    }
    // console.log("switching theme", { x: theme, modified });
    return modified;
  };

  return {
    subscribe,
    set,
    update,
    syncAppearanceFromCloud: (x: UserAppearanceSettings) => {
      update((a) => {
        const cs = colorSchemes.find((cs) => cs.id == x.lightColorSchemeId);
        const modified = { ...a, ...x, colorScheme: cs as ColorScheme };
        cache(modified);
        return modified;
      });
    },
    // rename to setAppearance
    setTheme: (skin: AppSkin, colorSchemeId: string) => {
      let cs = colorSchemes.find((cs) => cs.id == colorSchemeId);
      if (!cs) cs = colorSchemes[0];
      if (!cs) return;
      update((a) => {
        const modified = { ...a, skin, colorScheme: cs as ColorScheme };
        persist(modified);
        return modified;
      });
    },
    setColorScheme: (colorSchemeId: string) => {
      let cs = colorSchemes.find((cs) => cs.id == colorSchemeId);
      if (!cs) return;
      update((a) => {
        let modified;
        if (a.isSyncWithSystem && a.systemTheme != a.userThemeSetting) {
          modified = a;
        } else {
          modified = {
            ...a,
            colorScheme: cs as ColorScheme
          };
        }
        if (!cs.isDark) modified.lightColorSchemeId = colorSchemeId;
        else modified.darkColorSchemeId = colorSchemeId;
        persist(modified);
        return modified;
      });
    },
    modifyUserThemeSetting: (theme: Theme) => {
      update((a) => {
        let modified: AppearanceStore = { ...a, userThemeSetting: theme };
        if (!a.isSyncWithSystem) {
          modified = switchTheme(theme, modified);
        } else {
          modified = switchTheme(a.systemTheme, modified);
        }
        persist(modified);
        return modified;
      });
    },
    modifySyncWithSystem: (isSync: boolean) => {
      update((a) => {
        let modified = { ...a, isSyncWithSystem: isSync };
        if (isSync) {
          modified = switchTheme(a.systemTheme, modified);
        } else {
          modified = switchTheme(a.userThemeSetting, modified);
        }
        persist(modified);
        return modified;
      });
    },
    /**
     * Sets the system theme in appearance store to either light or dark based on `prefers-color-scheme: dark` media query and updates color scheme accordingly.
     * @param isDark boolean value to set the system theme to dark or light
     */
    setSystemTheme: (isDark: boolean) => {
      const current = get(appearance);
      const theme = isDark ? Theme.DARK : Theme.LIGHT;
      if (current.systemTheme === theme) return;
      update((a) => {
        let modified: AppearanceStore = { ...a, systemTheme: theme };
        if (a.isSyncWithSystem) {
          modified = switchTheme(theme, modified);
        }
        persist(modified);
        return modified;
      });
    },
    switchTheme: (theme: Theme) => {
      update((a) => {
        const modified = switchTheme(theme, a);
        persist(modified);
        return modified;
      });
    }
    // switchSkin
  };
}

export default appearance;

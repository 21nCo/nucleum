import { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type {
  IUserGlobalPreferences,
  UserAppearanceSettings
} from "$lib/client/types/preferences.type";
import { TimeScale } from "$lib/client/types/time.type";
import {
  detectTimeZone,
  detectTimeZoneFallback
} from "$lib/client/utils/time.utils";
import { get } from "svelte/store";
import { KeyValueStore } from "../flux/resourceStores/kv.store";
import { Resource } from "../flux/resourceStores/resource.enum";
import { flux } from "$lib/client/components/flux/flux";
import { PersistenceActionType } from "$lib/client/types/data.type";

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
      refreshOnAppear: true,
      isSynchronousCache: true,
      dboDependencies: [
        "fn::global::resource::delete",
        "fn::global::resource::fetch"
      ]
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
      const val = detectTimeZoneFallback();
      offset = val.offset;
      label = val.label;
    }
    //TODO - use flux instead of persistence
    await flux.mutation(Resource.tz, {
      action: PersistenceActionType.INSERT,
      resources: [
        {
          offset,
          date: new Date().toISOString(),
          label: label ?? ""
        }
      ]
    });
    //   await persistance.create(
    //     { offset, date: new Date().toISOString(), label: label ?? "" },
    //     Resource.tz
    //   );
    return this._setTimezone(offset, label);
  }
}

export const userPreferences = new UserPreferencesStore();

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
import { TranscriptionModel } from "$lib/client/products/memotron/taco/taco.types";
import { tzStore } from "./timezone/tz.store";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";

// const userPreferencesId = Item.globalPreferences;
const defaultColorSchemeId = "colorscheme:cleantidylightblue";
const defaultDarkColorSchemeId = "colorscheme:cleantidydarkblue";

export const seedUserPreferences: IUserGlobalPreferences = {
  name: "",
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
  lastUsedTranscriptionModel: TranscriptionModel.TINy_EN,
  appearance: {
    skin: AppSkin.Clean,
    theme: Theme.LIGHT,
    isSyncWithSystem: true,
    lightColorSchemeId: defaultColorSchemeId,
    darkColorSchemeId: defaultDarkColorSchemeId,
    isBlurredBgForPopups: false,
    isFixedLeftNav: false,
    typeface: "Sen"
  },
  avatarPicker: {
    skinIndex: 0,
    usedEmojis: [],
    iconColor: "bw",
    filled: false,
    usedIcons: []
  },
  annotations: [],
  mediaGridTestitems: [],
  infiniteGrid: {
    isGridCreated: false,
    grid: []
  },
  localAI: {
    semanticSearch: false,
    audioTranscription: false,
    markdownQAChat: false,
    vectorGenerationInProgress: false
  }
};

class UserPreferencesStore extends KeyValueStore<IUserGlobalPreferences> {
  constructor() {
    super(Resource.globalPreferences, seedUserPreferences, {
      dboDependencies: []
    });
  }
  loader(data: IUserGlobalPreferences) {
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
   * @param offset - The offset of the timezone from UTC in seconds
   * @param label - The label of the timezone
   * @returns
   */
  async setTimeZone(offset?: number, label?: string) {
    if (offset === undefined) {
      const val = detectTimeZoneFallback();
      offset = val.offset;
      label = val.label;
    }
    await tzStore.create({
      offset,
      date: new Date().toISOString(),
      dateUnix: resolveUnixTimestamp(),
      label: label ?? ""
    });
    return this._setTimezone(offset, label);
  }

  updateUserProfile(x: Partial<IUserGlobalPreferences>) {
    this.modify({ ...x });
  }
}

export const userPreferences = new UserPreferencesStore();

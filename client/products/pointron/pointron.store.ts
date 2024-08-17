import { writable } from "svelte/store";
import type { PointronConstants } from "$lib/client/types/pointron/pointronConstants.type";

import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { TimerMode } from "$lib/client/types/pointron/timerMode.enum";
import {
  SessionCompositionType,
  type SessionComposition,
  BreakCompositionType
} from "$lib/client/types/pointron/sessionComposition.type";
import { generateUID } from "$lib/client/utils/utils";
import { toasts } from "$lib/client/stores/notification.store";
import { ChartType } from "$lib/client/types/analytics.type";
import { TimePeriodType, TimeScale } from "$lib/client/types/time.type";
import { objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";
import { Layout } from "$lib/client/types/layout.type";
import type { ITag } from "$lib/client/types/pointron/tag.type";
import { StoreDataType } from "$lib/client/types/data.type";
import type { IPointronPreferences } from "$lib/client/types/pointron/pointronPreferences.type";
import { defaultAppMenu } from "$local/local";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { ResourceFIRStore } from "$lib/client/components/resourceStores/resource.store";

export const swipeLabel = writable("");
export const lastImportTime = writable<number>(Date.now());
const seedPresets: SessionComposition[] = [
  {
    id: generateUID(),
    type: SessionCompositionType.POMODORO,
    numberOfFocusRounds: 4,
    focusDuration: 28 * 60,
    breakDuration: 2 * 60,
    totalDuration: 0,
    breakReminder: 600,
    numberOfBreaks: 1,
    name: "Preset 1",
    breakType: BreakCompositionType.PREDEFINED
  },
  {
    id: generateUID(),
    type: SessionCompositionType.POMODORO,
    numberOfFocusRounds: 3,
    focusDuration: 10 * 60,
    breakDuration: 2 * 60,
    totalDuration: 0,
    breakReminder: 600,
    numberOfBreaks: 1,
    name: "Morning focus",
    breakType: BreakCompositionType.PREDEFINED
  },
  {
    id: generateUID(),
    type: SessionCompositionType.TOTAL_DURATION,
    focusDuration: 0,
    breakDuration: 10 * 60,
    totalDuration: 10 * 60 * 60,
    numberOfBreaks: 9,
    breakReminder: 600,
    name: "10 hr deep study",
    breakType: BreakCompositionType.PREDEFINED
  }
];

export const defaultHorizonChartConfiguration: HorizonChart[] = [
  {
    id: "topleft",
    period: {
      scale: TimeScale.DAYS,
      value: {
        type: TimePeriodType.RELATIVE,
        param: -1
      }
    },
    type: ChartType.PIE
  },
  {
    id: "topright",
    period: {
      scale: TimeScale.DAYS,
      value: {
        type: TimePeriodType.RELATIVE,
        param: 0
      }
    },
    type: ChartType.PIE
  },
  {
    id: "bottomleft",
    period: {
      scale: TimeScale.DAYS,
      value: {
        type: TimePeriodType.RELATIVE,
        param: -7
      }
    },
    type: ChartType.STACKEDBAR
  },
  {
    id: "bottomright",
    period: {
      scale: TimeScale.MONTHS,
      value: {
        type: TimePeriodType.RELATIVE,
        param: -6
      }
    },
    type: ChartType.STACKEDBAR
  }
];

// const userLocalPreferencesId = "Preferences:" + appName.toLowerCase();
const userLocalPreferencesId = Resource.pointronPreferences;
// const storeConfig = {
//   id: userLocalPreferencesId,
//   dataType: StoreDataType.KVO,
//   priorityRefreshOnAppAppear: true
// };
export const seedLocalPreferences: IPointronPreferences = {
  isEnableAgeCounter: false,
  extendDuration: 5,
  presets: seedPresets,
  isEnableAutoStartInterval: true,
  isIncludeBreakInAnalytics: false,
  timerMode: TimerMode.JOURNAL,
  appMenu: defaultAppMenu,
  manualEntryQuickDurations: [5, 10, 15, 30, 60],
  horizonCharts: defaultHorizonChartConfiguration,
  horizonsWithTarget: [],
  horizonTargets: [],
  breakReminder: 60 * 30,
  uiStates: {
    all: {
      quickFocusLayout: Layout.LIST,
      advancedComposeType: SessionCompositionType.POMODORO,
      advancedMode: 0
    },
    desktop: {
      quickFocusLayout: Layout.LIST,
      advancedComposeType: SessionCompositionType.POMODORO,
      advancedMode: 0
    },
    portrait: {
      quickFocusLayout: Layout.GRID,
      advancedComposeType: SessionCompositionType.POMODORO,
      advancedMode: 0
    }
  }
};
class PointronPreferencesStore extends KeyValueStore<IPointronPreferences> {
  constructor() {
    super(Resource.pointronPreferences, seedLocalPreferences, {
      refreshOnAppear: true,
      dboDependencies: [
        "fn::pointron::import",
        "fn::pointron::export",
        "fn::pointron::importChunk",
        "fn::pointron::revertImport",
        "fn::pointron::iOS::currentSessionWidget"
      ]
    });
  }
  loader(data: IPointronPreferences) {
    if (!data.id) return;
    data.appMenu = defaultAppMenu;
    if (!data.uiStates) data.uiStates = seedLocalPreferences.uiStates;
    if (!data.presets) data.presets = seedPresets;
    //m.horizonCharts = defaultHorizonChartConfiguration;
    this.modify(data, { isPersist: false });
  }
  async set(newValue: IPointronPreferences) {
    let changedProperties: any = {};
    if (this.previousValue) {
      let differences = shallowDiff(newValue, JSON.parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof IPointronPreferences];
      });
      //TODO - create separate method for updating horizons with targets instead of duplicating custom set method (set() is present in KeyValueStore class)
      if (differences.some((x) => x === "horizonsWithTarget")) {
        let horizonTargets = newValue.horizonTargets?.filter((x) =>
          newValue.horizonsWithTarget?.some((y) => y === x.scale)
        );
        changedProperties.horizonTargets = horizonTargets;
      }
    }
    this.modify(newValue, { isPersist: !objIsEmpty(changedProperties) });
  }
  resetHorizonChartConfiguration() {
    this.modify({ horizonCharts: defaultHorizonChartConfiguration });
  }
  async updatePreset(preset: SessionComposition) {
    let m = this.get();
    let n = m.presets;
    let currentPresetIndex = n.findIndex((p) => p.id == preset.id);
    let presetsToRight = n.slice(currentPresetIndex + 1);
    n = n.slice(0, currentPresetIndex);
    n = [...n, preset];
    n = n.concat(presetsToRight);
    return this.modify({ presets: n });
  }
  async removePreset(presetId: string) {
    let m = this.get();
    let n = m.presets;
    n = n.filter((x: SessionComposition) => x.id != presetId);
    return this.modify({ presets: n });
  }
  async addPreset(preset: SessionComposition) {
    let m = this.get();
    m.presets.push(preset);
    return this.modify({ presets: m.presets });
  }
}

export const pointronPreferences = new PointronPreferencesStore();
export const pointronConstants = initPointronConstants({
  timerModes: ["Minimal", "Journal"],
  focusPlaceholderText: [
    "cooking ice cream",
    "cleaning wordle",
    "coding dishes",
    "showering",
    "draining umbrella",
    "commanding alexa"
  ],
  runningOutDuration: 5,
  gapThreshold: 60
});

function initPointronConstants(seed: PointronConstants) {
  const { subscribe, set, update } = writable<PointronConstants>(seed);
  return {
    subscribe,
    set: (m: PointronConstants) => {
      set(m);
    },
    update
  };
}

export const oasisOidcConfig = {
  authority: "https://auth.oasislabs.com",
  // Replace with your app's frontend client ID.
  client_id: import.meta.env?.VITE_OASIS_CLIENT_ID,
  redirect_uri: `${window.location.origin}/play`,
  response_type: "code",
  scope: "openid profile email parcel.public",
  filterProtocolClaims: false,
  loadUserInfo: false,
  extraQueryParams: {
    audience: "https://api.oasislabs.com/parcel"
  },
  extraTokenParams: {
    audience: "https://api.oasislabs.com/parcel"
  }
};

export const seedSessions = [
  {
    elapsed: 60 * 60,
    focus: 47 * 60,
    brek: 13 * 60,
    extended: 0,
    startTime: new Date(2022, 1, 11, 13),
    endTime: new Date(2022, 1, 11, 14),
    id: new Date(2022, 1, 11, 13).getTime(),
    intention: ""
  },
  {
    elapsed: 60 * 60,
    focus: 47 * 60,
    brek: 13 * 60,
    extended: 0,
    startTime: new Date(2022, 1, 11, 14, 30),
    id: new Date(2022, 1, 11, 14, 30).getTime(),
    endTime: new Date(2022, 1, 11, 17),
    intention: "ID Card insurance project"
  },
  {
    elapsed: 60 * 60,
    focus: 47 * 60,
    brek: 13 * 60,
    extended: 0,
    startTime: new Date(2022, 1, 11, 17),
    id: new Date(2022, 1, 11, 17).getTime(),
    endTime: new Date(2022, 1, 11, 17, 32),
    intention: "de picto"
  },
  {
    elapsed: 60 * 60,
    focus: 47 * 60,
    brek: 13 * 60,
    extended: 0,
    startTime: new Date(2022, 1, 11, 19, 21),
    id: new Date(2022, 1, 11, 19, 21).getTime(),
    endTime: new Date(2022, 1, 11, 23),
    intention: ""
  }
];

export const seedTasks = [
  { label: "first task", estimate: 0, workedFor: 15, checked: true },
  {
    label: "second sdfasdfs task",
    estimate: 35,
    workedFor: 15,
    checked: false,
    isInprogress: true
  },
  { label: "third task", estimate: 35, workedFor: 45, checked: false }
];

class TagStore extends ResourceFIRStore<ITag> {
  constructor() {
    super(Resource.PointTag);
  }
  loader(data: any) {
    if (data) super.loader({ items: data });
  }
  async modify(item: ITag) {
    super.modify(item);
    toasts.success("Tag updated successfully");
    return true;
  }
  async create(data: Omit<ITag, "id">, id?: string) {
    super.create(data, id);
    toasts.success("Tag created successfully");
    return true;
  }
  async delete(id: string) {
    super.delete(id);
    toasts.success("Tag deleted successfully");
  }
}
export const tagStore = new TagStore();

export const backgroundSoundStore = initBackgroundSoundStore();

function initBackgroundSoundStore() {
  const { subscribe, set, update } = writable<{
    systemSound?: string;
    youtubeUrl?: string;
  }>({});
  return {
    subscribe,
    set,
    playYoutube: (url: string) => {
      set({ youtubeUrl: url });
    },
    resetYoutube: () => {
      update((x) => {
        x.youtubeUrl = undefined;
        return x;
      });
    },
    reset: () => {
      set({ systemSound: undefined });
    }
  };
}

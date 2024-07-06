import type {
  SessionComposition,
  SessionCompositionType
} from "$lib/client/types/pointron/sessionComposition.type";
import type { TimerMode } from "$lib/client/types/pointron/timerMode.enum";
import type { HorizonChart } from "$lib/client/types/analytics.type";
import type { Cloud } from "$lib/client/types/cloud.enum";
import type { Layout } from "$lib/client/types/layout.type";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { TimeScale } from "$lib/client/types/time.type";
import type { AnalyticsFilters } from "./analytics.type";

export interface IPointronPreferences extends IObservableStoreSubject {
  isEnableAgeCounter: boolean;
  breakEndSound?: string;
  focusEndSound?: string;
  sessionFinishSound?: string;
  extendDuration: number;
  presets: SessionComposition[];
  isEnableAutoStartInterval: boolean;
  isIncludeBreakInAnalytics: boolean;
  timerMode: TimerMode;
  breakReminder: number;
  appMenu: string[];
  cloudProvider?: Cloud;
  manualEntryQuickDurations?: number[];
  horizonCharts: HorizonChart[];
  horizonChartFilters?: AnalyticsFilters;
  horizonsWithTarget?: TimeScale[];
  horizonTargets?: { scale: TimeScale; target: number }[];
  uiStates: {
    all: LocalUiState;
    desktop: LocalUiState;
    portrait: LocalUiState;
  };
}

type LocalUiState = {
  quickFocusLayout: Layout;
  advancedComposeType: SessionCompositionType;
  advancedMode: number;
};

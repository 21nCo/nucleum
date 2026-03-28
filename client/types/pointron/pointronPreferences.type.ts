import type {
  SessionComposition,
  SessionCompositionType
} from "@21n/types/pointron/sessionComposition.type";
import type { TimerMode } from "@21n/types/pointron/timerMode.enum";
import type { ChartType } from "@21n/types/analytics.type";
import type { Cloud } from "@21n/types/cloud.enum";
import type { Layout } from "@21n/types/layout.type";
import type { TimePeriod, TimeScale } from "@21n/types/time.type";
import type { AnalyticsFilters } from "@21n/types/pointron/analytics.type";

export type HorizonChart = {
  id: string;
  period: TimePeriod;
  type: ChartType;
};

export interface IPointronPreferences {
  isEnableAgeCounter: boolean;
  breakEndSound?: string;
  focusEndSound?: string;
  sessionFinishSound?: string;
  extendDuration: number;
  presets: SessionComposition[];
  isEnableAutoStartInterval: boolean;
  /**
   * Whether to automatically activate Picture-in-Picture (PiP) on focus start
   */
  isEnableAutoPiP: boolean;
  isIncludeBreakInAnalytics: boolean;
  timerMode: TimerMode;
  breakReminder: number;
  /**
   * @deprecated - use appMenu store instead
   */
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

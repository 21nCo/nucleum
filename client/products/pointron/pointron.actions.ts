import StorageSettings from "$lib/client/products/pointron/settings/data/StorageSettings.svelte";
import SessionSettings from "$lib/client/products/pointron/settings/SessionSettings.svelte";
import WidgetSettings from "$lib/client/products/pointron/settings/WidgetSettings.svelte";
import TrackingSettings from "$lib/client/products/pointron/settings/targets/TrackingSettings.svelte";
import Focus from "$lib/client/products/pointron/focus/Focus.svelte";
import Zen from "$lib/client/products/pointron/focus/zen/Zen.svelte";
import FocusPlayer from "$lib/client/products/pointron/focus/player/FocusPlayer.svelte";
import { ActionType, type IAction } from "$lib/client/types/action.type";
import Journal from "$lib/client/products/pointron/journal/Journal.svelte";
import AddTagModal from "$lib/client/products/pointron/tag/AddTagModal.svelte";
import ImportAppData from "$lib/client/products/pointron/settings/ImportAppData/ImportAppData.svelte";
import TagsList from "$lib/client/products/pointron/settings/tags/TagsList.svelte";
import ConvertToSubGoalModal from "$lib/client/products/pointron/goals/ConvertToSubGoalModal.svelte";
import EditPresetView from "$lib/client/products/pointron/focus/advanced/presets/EditPresetModal.svelte";
import Onboarding from "$lib/client/products/pointron/onboarding/Onboarding.svelte";
import ComposeByEndTimeModal from "$lib/client/products/pointron/focus/advanced/composition/ComposeByEndTimeModal.svelte";
import ComposeModal from "$lib/client/products/pointron/focus/advanced/composition/ComposeModal.svelte";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import PresetSaveConfirmationModal from "$lib/client/products/pointron/focus/advanced/presets/PresetSaveConfirmationModal.svelte";
import SessionFinishedModal from "$lib/client/products/pointron/focus/elements/SessionFinishedModal.svelte";
import EditTagModal from "$lib/client/products/pointron/tag/EditTagModal.svelte";
import AnalyticsSettings from "$lib/client/products/pointron/settings/AnalyticsSettings.svelte";
import Think from "$lib/client/products/pointron/focus/Think.svelte";
import BackgroundMusic from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundMusic.svelte";
import { Size } from "$lib/client/types/size.enum";
import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
import { get } from "svelte/store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import modalEvent from "$lib/client/components/modal/modal.store";
import {
  toasts,
  confirmationNotification,
  appEvents
} from "$lib/client/stores/notification.store";
import { AlertType } from "$lib/client/types/notification.type";
import { generateUID } from "$lib/client/utils/utils";
import CreateGoal from "$lib/client/products/pointron/goals/create/CreateGoal.svelte";
import GoalHomeV2 from "$lib/client/products/pointron/goals/home/GoalHomeV2.svelte";
import FocusItemsModal from "$lib/client/products/pointron/focus/advanced/FocusItemsModal.svelte";
import BreakReminderModal from "$lib/client/products/pointron/focus/elements/BreakReminderModal.svelte";
import PredefinedIntervalNotifierOverlay from "$lib/client/products/pointron/focus/elements/PredefinedIntervalNotifierOverlay.svelte";
import { manualLogStore } from "$lib/client/products/pointron/logs/log.store";
import ControlPanelLogsPane from "$lib/client/products/pointron/logs/ControlPanelLogsPane.svelte";
import SessionLogPage from "$lib/client/products/pointron/logs/logPage/SessionLogPage.svelte";
import ManualLogPane from "$lib/client/products/pointron/logs/manualLog/ManualLogPane.svelte";
import LogsPane from "$lib/client/products/pointron/logs/LogsPane.svelte";
import AnalyticsV2 from "$lib/client/products/pointron/analytics/AnalyticsV2.svelte";
import { Orientation } from "$lib/client/types/direction.enum";
import PresetSettings from "$lib/client/products/pointron/focus/advanced/presets/PresetSettings.svelte";
import {
  pointSessionStore,
  sessionStore
} from "$lib/client/products/pointron/focus/session.store";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import AnalyticsViewsPageEditMobile from "./analytics/AnalyticsViewsPageEditMobile.svelte";
import { goalStore, quickFocusItemStore } from "./goals/goal.store";
import { appStore } from "$lib/client/stores/app.store";

const isSessionRunningPreCondition = () => get(sessionStore).isSessionRunning;

export const pointronActions: IAction[] = [
  {
    action: PointronAction.ANALYTICSVIEWSPAGEEDITMOBILE,
    component: AnalyticsViewsPageEditMobile,
    type: ActionType.MODAL,
    modalParams: {
      title: "Edit Pages",
      layout: {
        size: Size.lg,
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: PointronAction.FULL_SCREEN_FOCUS,
    component: Zen,
    icon: "zen",
    type: ActionType.MODAL,
    isMeta: true,
    associatedPlayer: PointronAction.FOCUS_PLAYER,
    modalParams: {
      layout: {
        ignoreSafeArea: true,
        size: Size.full
      }
    }
  },
  {
    action: PointronEvent.SESSION_FINISHED,
    component: SessionFinishedModal,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      isDismissable: false,
      layout: {
        size: Size.md,
        orientation: Orientation.Vertical,
        primaryAction: {
          label: "Done",
          callback: () => sessionStore.close()
        }
      }
    }
  },
  {
    action: PointronAction.SAVE_PRESET_MODAL,
    component: PresetSaveConfirmationModal,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.xs,
        primaryAction: {
          label: "Save Preset",
          callback: () => sessionStore.saveCurrentCompositionAsPreset()
        },
        secondaryAction: {
          label: "Cancel"
        }
      }
    }
  },
  {
    action: PointronAction.SESSION_LOG_MODAL,
    component: SessionLogPage,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      title: "Session Log",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: PointronAction.COMPOSE_BY_END_TIME_MODAL,
    component: ComposeByEndTimeModal,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      title: "Choose end time",
      layout: {
        secondaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: PointronAction.COMPOSE_TIME_MODAL,
    component: ComposeModal,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.lg,
        primaryAction: {
          label: "Proceed"
        },
        secondaryAction: {
          label: "Cancel"
        }
      }
    }
  },
  //TODO - Disabling sheet due to issues with stores not being present.
  {
    action: PointronAction.MANUAL_FOCUS_ENTRY_POP,
    component: ManualLogPane,
    get label() {
      return this.modalParams?.title;
    },
    type: ActionType.MODAL,
    modalParams: {
      title: "Manual time entry",
      isShowAsSheet: false,
      layout: {
        size: Size.xl,
        primaryAction: {
          label: "Save entries",
          style: ButtonStyle.DEFAULT,
          callback: () => manualLogStore.saveManualLogs()
        },
        secondaryAction: {
          label: "Discard",
          callback: () => {
            setTimeout(() => {
              manualLogStore.reset();
            }, 100);
            return Promise.resolve(true);
          }
        }
      }
    }
  },
  {
    action: PointronAction.EDIT_PRESET,
    component: EditPresetView,
    type: ActionType.MODAL,
    label: "Create a new preset",
    modalParams: {
      title: "Edit Preset",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: PointronEvent.BREAK_REMINDER,
    component: BreakReminderModal,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      title: "Break Reminder",
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical,
        secondaryAction: {
          label: "Continue working"
        },
        primaryAction: {
          label: "Take break",
          callback: () => sessionStore.startBreak()
        }
      }
    }
  },
  {
    action: PointronAction.PREDEFINED_INTERVAL_NOTIFIER_OVERLAY,
    component: PredefinedIntervalNotifierOverlay,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      isShowOverlay: false,
      layout: {
        size: Size.xs,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: PointronAction.ADD_TAG,
    component: AddTagModal,
    type: ActionType.MODAL,
    label: "Add Tag",
    modalParams: {
      title: "Add Tag",
      isShowAsSheet: false,
      layout: {
        size: Size.xs
      }
    }
  },
  {
    action: PointronAction.EDIT_TAG,
    type: ActionType.MODAL,
    isMeta: true,
    component: EditTagModal,
    modalParams: {
      isShowAsSheet: false,
      layout: {
        size: Size.xs
      }
    }
  },
  {
    action: PointronAction.CONVERT_TO_SUBGOAL,
    component: ConvertToSubGoalModal,
    type: ActionType.MODAL,
    isMeta: true
  },
  {
    action: PointronAction.IMPORT_APP_DATA,
    component: ImportAppData,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: PointronAction.LOGS,
    component: LogsPane,
    isMenuHidden: true,
    get label() {
      return this.modalParams?.title;
    },
    cmdLabel: "See Logs",
    type: ActionType.MODAL,
    icon: "history",
    modalParams: {
      title: "Logs",
      isShowAsSheet: true,
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: "onboarding",
    component: Onboarding,
    isMenuHidden: true,
    label: "Onboarding",
    type: ActionType.PAGE,
    isMeta: true
  },
  {
    action: "cplogs",
    component: ControlPanelLogsPane,
    path: "cp/logs",
    label: "Logs",
    type: ActionType.PAGE,
    isMeta: true,
    icon: "history"
  },
  {
    action: PointronAction.TAGS,
    component: TagsList,
    path: "cp/tags",
    label: "Edit Tags",
    icon: "tag",
    type: ActionType.MODAL,
    modalParams: {
      title: "Edit Tags",
      isShowAsSheet: false,
      layout: {
        secondaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: "journal",
    component: Journal,
    icon: "journal",
    label: "Journal",
    type: ActionType.PAGE
  },
  {
    action: PointronAction.FOCUS_PLAYER,
    type: ActionType.INLINE,
    isMeta: true,
    component: FocusPlayer
  },
  {
    action: PointronAction.FOCUS,
    component: Focus,
    icon: "bolt",
    type: ActionType.PAGE,
    label: "Focus"
  },
  {
    action: "analytics",
    component: AnalyticsV2,
    type: ActionType.PAGE,
    icon: "chart",
    label: "Analytics",
    modalParams: {
      layout: {
        size: Size.full
      }
    }
  },
  {
    action: "goal",
    component: GoalHomeV2,
    icon: "goals",
    type: ActionType.PAGE,
    label: "Goals"
  },
  {
    action: PointronAction.SESSION_SETTINGS_MODAL,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Session",
    path: "cp/session",
    type: ActionType.MODAL,
    component: SessionSettings,
    modalParams: {
      title: "Session Settings",
      layout: {
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: "alerts",
    cmdLabel: "Alert Settings",
    label: "Alerts",
    path: "cp/alerts",
    icon: "bell",
    type: ActionType.PAGE,
    component: ComingSoonView
  },
  {
    action: "presets",
    label: "Presets",
    path: "cp/presets",
    icon: "folder",
    type: ActionType.MODAL,
    component: PresetSettings,
    modalParams: {
      title: "Presets",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: PointronAction.IMPORT_EXPORT,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Import / Export",
    path: "cp/importexport",
    icon: "data",
    type: ActionType.MODAL,
    // isInactive: true,
    component: StorageSettings,
    modalParams: {
      title: "Import / Export data",
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: PointronAction.IMPORT_EXPORT_TRIGGER,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Import / Export",
    path: "cp/importexport",
    icon: "data",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      appStore.runAction(PointronAction.IMPORT_EXPORT);
    }
  },
  {
    action: "widgets",
    label: "Widgets",
    path: "cp/widgets",
    icon: "widget",
    type: ActionType.PAGE,
    isInactive: true,
    component: WidgetSettings
  },
  {
    action: PointronAction.SET_TARGETS,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Targets",
    path: "cp/targets",
    icon: "fire",
    type: ActionType.MODAL,
    component: TrackingSettings,
    modalParams: {
      title: "Target Settings"
    }
  },
  {
    action: "analytics-settings",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Analytics",
    path: "cp/analytic-settings",
    icon: "chart",
    type: ActionType.MODAL,
    component: AnalyticsSettings,
    modalParams: {
      title: "Analytics Settings"
    }
  },
  {
    action: "test",
    label: "Test",
    path: "test",
    type: ActionType.PAGE,
    isMeta: true
  },
  {
    action: PointronAction.BACKGROUND_MUSIC,
    label: "Background music",
    type: ActionType.MODAL,
    preCondition: isSessionRunningPreCondition,
    component: BackgroundMusic,
    modalParams: {
      layout: {
        size: Size.lg,
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: PointronAction.PIN_TO_QUICK_FOCUS,
    label: "Pin a goal to quick focus",
    type: ActionType.SEARCH_CMD,
    searchActionParams: {
      searchStoreId: Resource.PointGoal,
      itemLabel: "goal",
      callback: async (id: string, label?: string) => {
        console.log("search action selected id:", { id });
        const result = await quickFocusItemStore.pinGoal(id);
        toasts.trigger({
          title: "Goal: " + label,
          message: result === -1 ? "Already pinned" : "Pinned to quick focus",
          type: result === -1 ? AlertType.ERROR : AlertType.SUCCESS,
          id: generateUID()
        });
      }
    }
  },
  {
    action: PointronAction.QUICK_FOCUS,
    label: "Quick focus",
    type: ActionType.SEARCH_CMD,
    searchActionParams: {
      searchStoreId: Resource.PointGoal,
      itemLabel: "goal",
      callback: (id: string, label?: string) => {
        console.log("search action selected id:", { id });
        sessionStore.quickStart(id);
      }
    }
  },
  {
    action: PointronAction.START_FOCUS_SESSION,
    label: "Start a new focus session",
    type: ActionType.FUNCTION,
    fn: async () => {
      sessionStore.startSession();
    }
  },
  {
    action: PointronAction.FINISH_FOCUS_SESSION,
    label: "Finish the current session",
    fn: sessionStore.finishSession,
    type: ActionType.CONFIRMATION,
    preCondition: isSessionRunningPreCondition,
    confirmation: {
      title: "Finish focus session",
      message: "Are you sure you want to finish this focus session?",
      confirmAction: {
        label: "Finish",
        variant: ButtonVariant.PRIMARY,
        callback: () => {
          return Promise.resolve(sessionStore.finishSession());
        }
      }
    }
  },
  {
    action: PointronAction.ABANDON_SESSION,
    label: "Abandon the current session",
    fn: sessionStore.close,
    type: ActionType.CONFIRMATION,
    preCondition: isSessionRunningPreCondition,
    confirmation: {
      title: "Abandon focus session",
      message: "Are you sure you want to abandon this focus session?",
      confirmAction: {
        label: "Abandon",
        variant: ButtonVariant.DANGER,
        callback: () => {
          return Promise.resolve(sessionStore.close());
        }
      }
    }
  },
  // TODO - disabling sheet - as causing issues with stores not being present
  {
    action: PointronAction.CREATE_EDIT_GOAL,
    get label() {
      return this.modalParams?.title;
    },
    type: ActionType.MODAL,
    component: CreateGoal,
    modalParams: {
      title: "Create a new goal",
      isShowAsSheet: false,
      layout: {
        size: Size.xl
      }
    }
  },
  {
    action: PointronAction.THINK_MODE,
    label: "Think mode",
    icon: "think",
    type: ActionType.MODAL,
    preCondition: isSessionRunningPreCondition,
    component: Think,
    modalParams: {
      layout: {
        size: Size.full,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: PointronAction.DELETE_SESSION,
    type: ActionType.FUNCTION,
    fn: async (params: any) => {
      confirmationNotification.notify({
        title: "Delete session",
        message: "Are you sure you want to delete this session log?",
        confirmAction: {
          label: "Delete",
          icon: "trash",
          variant: ButtonVariant.DANGER,
          callback: async () => {
            const response = await pointSessionStore.delete(params.id);
            if (response) {
              toasts.success("Session log deleted successfully");
              appEvents.publish(PointronEvent.REFRESH_LOGS);
            } else {
              toasts.error("Failed to delete session log");
            }
            modalEvent.hideSpecific(PointronAction.SESSION_LOG_MODAL);
          }
        }
      });
    }
  },
  {
    action: PointronAction.SHOW_FOCUSITEMS_MODAL,
    type: ActionType.MODAL,
    component: FocusItemsModal,
    modalParams: {
      title: "Focus Items",
      isShowAsSheet: false,
      layout: {
        size: Size.lg,
        secondaryAction: {
          label: "Done"
        }
      }
    }
  }
];

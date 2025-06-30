import StorageSettings from "$lib/client/products/pointron/settings/data/StorageSettings.svelte";
import WidgetSettings from "$lib/client/products/pointron/settings/WidgetSettings.svelte";
import TrackingSettings from "$lib/client/products/pointron/settings/targets/TrackingSettings.svelte";
import Focus from "$lib/client/products/pointron/focus/Focus.svelte";
import Zen from "$lib/client/products/pointron/focus/zen/Zen.svelte";
import FocusPlayer from "$lib/client/products/pointron/focus/player/FocusPlayer.svelte";
import {
  ActionType,
  type IAction,
  type IActionFnParams
} from "$lib/client/types/action.type";
import Journal from "$lib/client/products/pointron/journal/Journal.svelte";
import ImportAppData from "$lib/client/products/pointron/settings/ImportAppData/ImportAppData.svelte";
import EditPresetView from "$lib/client/products/pointron/focus/advanced/presets/EditPresetModal.svelte";
import PointronOnboarding from "$lib/client/products/pointron/base/PointronOnboarding.svelte";
import ComposeByEndTimeModal from "$lib/client/products/pointron/focus/advanced/composition/ComposeByEndTimeModal.svelte";
import ComposeModal from "$lib/client/products/pointron/focus/advanced/composition/ComposeModal.svelte";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import PresetSaveConfirmationModal from "$lib/client/products/pointron/focus/advanced/presets/PresetSaveConfirmationModal.svelte";
import SessionFinishedModal from "$lib/client/products/pointron/focus/elements/SessionFinishedModal.svelte";
import Think from "$lib/client/products/pointron/focus/Think.svelte";
import BackgroundMusic from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundMusic.svelte";
import { Size } from "$lib/client/types/size.enum";
import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
import { get } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  toasts,
  confirmationNotification
} from "$lib/client/stores/notification.store";
import FocusItemsModal from "$lib/client/products/pointron/focus/advanced/FocusItemsModal.svelte";
import BreakReminderModal from "$lib/client/products/pointron/focus/elements/BreakReminderModal.svelte";
import PredefinedIntervalNotifierOverlay from "$lib/client/products/pointron/focus/elements/PredefinedIntervalNotifierOverlay.svelte";
import {
  manualLogStore,
  sessionLogStore
} from "$lib/client/products/pointron/logs/log.store";
import ControlPanelLogsPane from "$lib/client/products/pointron/logs/ControlPanelLogsPane.svelte";
import SessionLogPage from "$lib/client/products/pointron/logs/logPage/SessionLogPage.svelte";
import ManualLogPane from "$lib/client/products/pointron/logs/manualLog/ManualLogPane.svelte";
import LogsPane from "$lib/client/products/pointron/logs/LogsPane.svelte";
import AnalyticsV2 from "$lib/client/products/pointron/analytics/AnalyticsV2.svelte";
import { Orientation } from "$lib/client/types/direction.enum";
import PresetSettings from "$lib/client/products/pointron/focus/advanced/presets/PresetSettings.svelte";
import {
  sessionStore,
  activeSession
} from "$lib/client/products/pointron/focus/session.store";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
import AnalyticsViewsPageEditMobile from "./analytics/AnalyticsViewsPageEditMobile.svelte";
import { appStore } from "$lib/client/stores/app.store";
import { Embed } from "$lib/client/types/context.type";
import ImportOnboarding from "./settings/data/ImportOnboarding.svelte";
import { Action } from "$lib/client/types/action.enum";
import FocusPlayerCommandModeWidget from "./focus/player/FocusPlayerCommandModeWidget.svelte";
import PointronLibrary from "./library/PointronLibrary.svelte";
import { SearchStore } from "$lib/client/components/record/record.store";
import { goalStore } from "$lib/client/components/goals/goal.store";
import GoalSearchResultItem from "$lib/client/components/goals/GoalSearchResultItem.svelte";
import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
import {
  resolveResourceIcon,
  resourceAction,
  resourceCacheComponentKey
} from "$lib/client/components/flux/resourceStores/resource.utils";
import ResourceCache from "$lib/client/components/record/ResourceCache.svelte";
import ResourceBrowser from "$lib/client/components/library/resourceBrowser/ResourceBrowser.svelte";
import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
//TODO - use dummy task if this causes any issues - like earlier
import Task from "$lib/client/components/tasks/Task.svelte";
import CreateTask from "$lib/client/components/tasks/CreateTask.svelte";
import { taskStore } from "$lib/client/components/tasks/task.store";
import Goal from "$lib/client/components/goals/Goal.svelte";
import GoalTitleLabelPart from "$lib/client/components/goals/GoalTitleLabelPart.svelte";
import { AppSearchParam } from "$lib/client/types/appStore.type";

const isSessionRunningPreCondition = () => get(activeSession).isSessionRunning;

export const pointronActions: IAction[] = [
  {
    action: PointronAction.ANALYTICS_VIEWS_PAGE_EDIT_MOBILE,
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
          callback: () => {
            const focus = get(activeSession);
            if (focus.state === SessionState.PRE_FINISHED) {
              return activeSession.finishSession({ isClose: true });
            } else {
              return activeSession.close();
            }
          }
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
      title: "Save as preset"
    }
  },
  {
    action: Resource.session,
    component: SessionLogPage,
    type: ActionType.RESOURCE,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.lg,
        isShowCantileverClose: true,
        isShowBackButton: true
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
    action: PointronAction.MANUAL_FOCUS_ENTRY,
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
          callback: () => manualLogStore.save()
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
          callback: () => activeSession.startBreak()
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
    action: PointronAction.IMPORT_APP_DATA,
    component: ImportAppData,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal
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
    component: PointronOnboarding,
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
    action: "journal",
    component: Journal,
    isInactive: true,
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
    action: PointronAction.FOCUS_PLAYER + Action.CMD,
    type: ActionType.INLINE,
    isMeta: true,
    component: FocusPlayerCommandModeWidget
  },
  {
    action: PointronAction.FOCUS,
    component: Focus,
    icon: "ph:circle-light",
    type: ActionType.PAGE,
    label: "Focus"
  },
  {
    action: PointronAction.FOCUS_MODAL,
    component: Focus,
    icon: "ph:circle-light",
    type: ActionType.RESOURCE,
    isMeta: true,
    label: "Focus",
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: Action.OVERVIEW,
    component: AnalyticsV2,
    type: ActionType.PAGE,
    // icon: "ph:presentation-chart-light",
    // icon: "ph:chart-line-up-light",
    icon: "heroicons:rectangle-group",
    label: "Overview"
  },
  // {
  //   action: "goal",
  //   component: Goals,
  //   icon: "goals",
  //   type: ActionType.PAGE,
  //   label: "Goals"
  // },
  {
    action: "alerts",
    cmdLabel: "Alert Settings",
    label: "Alerts",
    path: "cp/alerts",
    isInactive: true,
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
    isInactive: true,
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
    },
    hideContext: [Embed.HANDSET]
  },
  {
    action: PointronAction.IMPORT_ONBOARDING,
    label: "Import onboarding",
    type: ActionType.MODAL,
    isMeta: true,
    component: ImportOnboarding,
    modalParams: {
      layout: {
        size: Size.md,
        primaryAction: {
          label: "I will do it later",
          icon: "clock"
        }
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
    },
    hideContext: [Embed.HANDSET]
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
    isInactive: true,
    icon: "fire",
    type: ActionType.MODAL,
    component: TrackingSettings,
    modalParams: {
      title: "Target Settings"
    }
  },
  {
    action: PointronAction.BACKGROUND_MUSIC,
    label: "Background music",
    type: ActionType.MODAL,
    isInactive: true,
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
      placeholder: "Select a task to pin",
      searchResultComponent: GoalSearchResultItem,
      searchCallback: async (searchQuery: string) => {
        const result = await new SearchStore(Resource.goal).select({
          searchQuery,
          filters: {
            isPinnedForQuickFocus: false
          }
        });
        return result;
      },
      callback: async (item: any) => {
        const result = await goalStore.modify(
          item.id,
          {
            isPinnedForQuickFocus: true
          },
          {
            context: PointronAction.PIN_TO_QUICK_FOCUS
          }
        );
        if (result)
          toasts.success(`Goal **${item.label}** pinned to quick focus`);
        else toasts.error("Failed to pin goal to quick focus");
      }
    }
  },
  {
    action: PointronAction.QUICK_FOCUS,
    label: "Quick focus",
    type: ActionType.SEARCH_CMD,
    searchActionParams: {
      searchResultComponent: GoalSearchResultItem,
      searchCallback: async (searchQuery: string) => {
        const result = await new SearchStore(Resource.goal).select({
          searchQuery,
          isIncludeSubItems: true
        });
        return result;
      },
      placeholder: "Select a goal to focus",
      callback: (item: any) => {
        console.log("search action selected id:", { id: item.id });
        activeSession.quickStart(item.id);
      }
    }
  },
  {
    action: PointronAction.START_FOCUS_SESSION,
    label: "Start a new focus session",
    type: ActionType.FUNCTION,
    fn: async () => {
      activeSession.startSession();
    }
  },
  {
    action: PointronAction.TOGGLE_FOCUS_SESSION,
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      if (isSessionRunningPreCondition()) {
        appStore.runAction(PointronAction.FINISH_FOCUS_SESSION);
      } else {
        appStore.runAction(PointronAction.START_FOCUS_SESSION);
      }
    }
  },
  {
    action: PointronAction.FINISH_FOCUS_SESSION,
    label: "Finish the current session",
    fn: async (params?: IActionFnParams) => {
      activeSession.finishSession(params?.componentParams);
    },
    type: ActionType.CONFIRMATION,
    preCondition: isSessionRunningPreCondition,
    confirmation: {
      title: "Finish focus session",
      message: "Are you sure you want to finish this focus session?",
      confirmAction: {
        label: "Finish",
        variant: ButtonVariant.PRIMARY,
        callback: () => {
          return Promise.resolve(activeSession.finishSession());
        }
      }
    }
  },
  {
    action: PointronAction.ABANDON_SESSION,
    label: "Abandon the current session",
    fn: activeSession.close,
    type: ActionType.CONFIRMATION,
    preCondition: isSessionRunningPreCondition,
    confirmation: {
      title: "Abandon focus session",
      message: "Are you sure you want to abandon this focus session?",
      confirmAction: {
        label: "Abandon",
        variant: ButtonVariant.DANGER,
        callback: () => {
          return Promise.resolve(activeSession.close());
        }
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
    fn: async (params?: IActionFnParams) => {
      confirmationNotification.notify({
        title: "Delete session",
        message: "Are you sure you want to delete this session log?",
        confirmAction: {
          label: "Delete",
          icon: "ph:trash-light",
          variant: ButtonVariant.DANGER,
          callback: async () => {
            const response = await sessionStore.delete(
              params?.componentParams?.id,
              {
                context: PointronAction.DELETE_SESSION
              }
            );
            const sessionLogs = await sessionLogStore.selectMany({
              properties: ["id"],
              filters: {
                sessionId: params?.componentParams?.id?.toString()
              }
            });
            if (sessionLogs) {
              await sessionLogStore.deleteMany(
                sessionLogs.map((log: any) => log.id)
              );
            }
            if (response) {
              toasts.success("Session log deleted successfully");
            } else {
              toasts.error("Failed to delete session log");
            }
            appStore.closeResource({ id: params?.componentParams?.id });
            return true;
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
  },
  {
    action: Action.LIBRARY,
    label: "Library",
    icon: "ph:stack-light",
    component: PointronLibrary,
    type: ActionType.PAGE,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: resourceCacheComponentKey(Resource.goal),
    type: ActionType.CACHE,
    component: ResourceCache,
    componentParams: {
      resource: Resource.goal
    }
  },
  {
    action: resourceCacheComponentKey(Resource.task),
    type: ActionType.CACHE,
    component: ResourceCache,
    componentParams: {
      resource: Resource.task
    }
  },
  {
    action: resourceAction(Resource.goal, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Goals",
    icon: resolveResourceIcon(Resource.goal),
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.goal
    },
    loadingComponent: NodeLoadingPulse
  },
  {
    action: resourceAction(Resource.goal, ResourceActionType.CREATE),
    label: "Create a new goal",
    type: ActionType.FUNCTION,
    fn: async (props?: IActionFnParams) => {
      await goalStore.createNew({
        ...props?.componentParams,
        linkSearchParam: props?.searchParams?.[AppSearchParam.LINK]
      });
    }
  },
  {
    action: Resource.goal,
    type: ActionType.MODAL,
    component: Goal,
    resourceLabelRenderer: GoalTitleLabelPart,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: true
      }
    }
  },
  {
    action: Action.EDIT_TASK_GOAL,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Edit goal for task",
    isMeta: true,
    searchActionParams: {
      placeholder: "select a goal",
      searchResultComponent: GoalSearchResultItem,
      searchCallback: async (query: string, componentParams?: any) => {
        return new SearchStore(Resource.goal).select({
          resource: Resource.goal,
          searchQuery: query,
          limit: 50
        });
      },
      callback: async (item: any, componentParams?: any) => {
        await taskStore.modify(
          componentParams.taskId,
          {
            goalId: item.id
          },
          {
            context: componentParams?.context
          }
        );
        toasts.success(`Goal updated for task`);
      }
    }
  },
  {
    action: resourceAction(Resource.task, ResourceActionType.CREATE),
    label: "Create a new task",
    type: ActionType.MODAL,
    component: CreateTask,
    modalParams: {
      layout: {
        isDynamicSize: true
      }
    }
  },
  {
    action: Resource.task,
    isMeta: true,
    type: ActionType.RESOURCE,
    component: Task,
    modalParams: {
      layout: {
        isDynamicSize: true,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: resourceAction(Resource.task, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Tasks",
    icon: resolveResourceIcon(Resource.task),
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.task
    },
    loadingComponent: NodeLoadingPulse
  }
];

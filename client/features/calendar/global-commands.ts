import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import Calendar from "@nucleum/features/calendar/Calendar.svelte";
import CalendarSettings from "@nucleum/features/calendar/settings/CalendarSettings.svelte";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import CreateEvent from "@nucleum/features/calendar/events/CreateEvent.svelte";
import Event from "@nucleum/features/calendar/events/Event.svelte";
import SampleCalendarItemThumbnail from "@nucleum/features/calendar/column/timeline/SampleCalendarItemThumbnail.svelte";
import FocusCalendarEntryThumbnail from "@nucleum/features/calendar/column/timeline/focusEntry/FocusCalendarEntryThumbnail.svelte";
import CalendarDayModal from "@nucleum/features/calendar/column/CalendarDayModal.svelte";
import HistoryModal from "@nucleum/features/calendar/HistoryModal.svelte";
import Today from "@nucleum/features/calendar/Today.svelte";
import { appMenuActionLabelsByAction } from "@nucleum/client/config/product-nav.config";

/** Commands owned by calendar; assembled in application composition. */
export const calendarCommands = {
  calendar: {
    action: Action.CALENDAR,
    label: appMenuActionLabelsByAction[Action.CALENDAR],
    icon: "calendar",
    type: ActionType.PAGE,
    component: Calendar
  },
  event_create: {
    action: resourceAction(Resource.event, ResourceActionType.CREATE),
    component: CreateEvent,
    label: "Create a new event",
    type: ActionType.MODAL,
    modalParams: {
      title: "Create event",
      layout: {
        size: Size.md,
        orientation: Orientation.Vertical,
        ignoreSafeArea: true
      }
    }
  },
  event: {
    action: Resource.event,
    type: ActionType.MODAL,
    component: Event,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: true
      }
    }
  },
  samplecalendaritemthumbnail: {
    action: "sampleCalendarItemThumbnail",
    type: ActionType.INLINE,
    isMeta: true,
    component: SampleCalendarItemThumbnail
  },
  focustimelineentry: {
    action: "focusTimelineEntry",
    type: ActionType.INLINE,
    isMeta: true,
    component: FocusCalendarEntryThumbnail
  },
  calendar_day: {
    action: Action.CALENDAR_DAY,
    type: ActionType.RESOURCE,
    isMeta: true,
    component: CalendarDayModal,
    modalParams: {
      title: "Day review",
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  history: {
    action: Action.HISTORY,
    label: "Activity",
    icon: "history",
    type: ActionType.RESOURCE,
    component: HistoryModal,
    modalParams: {
      title: "Activity",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  calendar_settings: {
    action: Action.CALENDAR_SETTINGS,
    type: ActionType.MODAL,
    label: "Calendar Settings",
    icon: "sliders",
    component: CalendarSettings,
    modalParams: {
      title: "Calendar Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  today: {
    action: Action.TODAY,
    icon: "calendar-blank",
    label: "Today",
    type: ActionType.LIVE,
    component: Today,
    accessMode: AccessMode.RIGHT,
    liveActionParams: {
      size: Size.md
    }
  }
} satisfies Record<string, IAction | IAction[]>;

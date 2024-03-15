import AppearanceSettings from "$lib/tidy/components/settings/appearance/AppearanceSettings.svelte";
import {
  ThinModeBehavior,
  PaintType,
  type Action,
  ActionType,
  ContentType
} from "$lib/tidy/types/action.type";
import NotFound from "../components/error/PageError.svelte";
import OpenPreviewMode from "../components/settings/appearance/OpenPreviewMode.svelte";
import DebugLogs from "../components/error/DebugLogs.svelte";
import Offline from "../components/error/Offline.svelte";
import Signup from "../components/settings/account/Signup.svelte";
import ToastModalPortrait from "../elements/feedback/ToastModalPortrait.svelte";
import CommandBar from "../components/commandBar/CommandBar.svelte";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";
import { AppEvent } from "../types/event.enum";
import { appStore, intercomId, isInEditMode } from "../stores/app.store";
import Help from "../components/help/Help.svelte";
import ManualRunDbo from "../components/settings/ManualRunDbo.svelte";

export const globalActions: Action[] = [
  {
    action: "404",
    type: ActionType.META_PAGE,
    component: NotFound
  },
  {
    action: "offline",
    type: ActionType.META_PAGE,
    component: Offline
  },
  {
    action: "signup",
    component: Signup,
    type: ActionType.META_PAGE,
    isMenuHidden: true
  },
  {
    action: "debuglogs",
    icon: "code",
    type: ActionType.META_PAGE,
    component: DebugLogs
  },
  {
    label: "Appearance",
    action: "settings/appearance",
    component: AppearanceSettings,
    sections: ["openPreviewMode", "basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    isInactive: true,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT
  },
  {
    action: "openPreviewMode",
    label: "Open Preview Mode",
    path: "settings/appearance/openPreviewMode",
    pagePaint: PaintType.JUMP_TO_PARENT,
    component: OpenPreviewMode,
    type: ActionType.META,
    thinModeBehavior: ThinModeBehavior.HIDE
  },

  {
    action: "productguide",
    label: "Product guide",
    icon: "academic-cap",
    link: "productguide"
  },
  {
    action: "tutorial",
    label: "Start tutorial",
    icon: "play",
    link: "productguide"
  },
  {
    action: "downloads",
    label: "Downloads",
    icon: "download",
    type: ActionType.LINK,
    link: "downloads"
  },
  {
    action: "chat",
    label: "Chat with us",
    icon: "chatleftright",
    type: ActionType.FUNCTION,
    fn: async () => {
      setTimeout(() => {
        if ((window as any).Intercom) {
          (window as any).Intercom("boot", {
            app_id: intercomId
          });
          (window as any).Intercom("show");
        } else {
          console.error("Intercom is not defined");
        }
      }, 300);
    },
    link: "chat"
  },
  {
    action: "call",
    label: "Book a call",
    icon: "video-camera",
    type: ActionType.LINK,
    link: "call"
  },
  {
    action: "faqs",
    label: "FAQs",
    icon: "help",
    type: ActionType.LINK,
    link: "faqs"
  },
  {
    action: "discord",
    label: "Join us on discord",
    icon: "users",
    type: ActionType.LINK,
    link: "discord"
  },
  {
    action: "twitter",
    label: "Share on socials",
    icon: "megaphone",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "credits",
    label: "Credits",
    icon: "face-smile",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "credits"
  },
  {
    action: "git",
    label: "Star us on git",
    icon: "star",
    type: ActionType.LINK,
    link: "git"
  },
  {
    action: "privacy",
    label: "Privacy policy",
    icon: "lock-closed",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "privacy"
  },
  {
    action: "changelog",
    label: "What's new",
    icon: "sparkles",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "changelog"
  },
  {
    action: "roadmap",
    label: "Roadmap",
    icon: "map",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "roadmap"
    // on db - gathery id will be saved for this key ex: roadmap: "gathery:page:id"
  },
  {
    action: "feedback",
    label: "Give feedback",
    icon: "chat-bubble-bottom-center",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "tallyFeedback"
  },
  {
    action: "requestfeature",
    label: "Request a feature",
    icon: "light-bulb",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "tallyFeedback"
  },
  {
    action: "report",
    label: "Report an issue",
    icon: "flag",
    type: ActionType.MODAL,
    contentType: ContentType.GATHERYDOC,
    link: "tallyFeedback"
    //"gathery:form:id"
  },
  {
    action: AppEvent.MOBILE_TOAST,
    component: ToastModalPortrait,
    type: ActionType.META_MODAL,
    modalParams: {
      layout: {
        size: Size.xs
      }
    }
  },
  {
    action: AppEvent.EDIT_MODE,
    fn: () => isInEditMode.toggle(),
    type: ActionType.META,
    label: "Edit mode"
  },
  {
    action: AppEvent.HELP,
    label: "Help",
    type: ActionType.MODAL,
    component: Help,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: AppEvent.CMD,
    label: "Command bar",
    component: CommandBar,
    type: ActionType.META_MODAL,
    modalParams: {
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: AppEvent.MANUAL_RUN_DBO,
    component: ManualRunDbo,
    type: ActionType.META_MODAL,
    isMenuHidden: true,
    modalParams: {
      layout: {
        size: Size.sm
      }
    }
  },
  {
    action: AppEvent.TOGGLE_SIDEBAR,
    type: ActionType.FUNCTION,
    label: "Toggle sidebar",
    fn: () => {
      appStore.toggleSidebar();
    }
  }
];

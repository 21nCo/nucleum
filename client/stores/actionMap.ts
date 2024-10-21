import {
  type IAction,
  type IActionFnParams,
  ActionType,
  ContentType
} from "$lib/client/types/action.type";
import PageError from "../components/error/PageError.svelte";
import DebugLogs from "../components/error/DebugLogs.svelte";
import Offline from "../components/error/Offline.svelte";
import Signup from "../components/settings/account/Signup.svelte";
import ToastModalPortrait from "../elements/feedback/ToastModalPortrait.svelte";
import CommandBar from "../components/commandBar/CommandBar.svelte";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";
import { appStore, intercomId, isInEditMode } from "./app.store";
import Help from "../components/help/Help.svelte";
import ManualRunDbo from "../components/settings/ManualRunDbo.svelte";
import ExtensionLoginStatusPage from "../components/settings/ExtensionLoginStatusPage.svelte";
import DebugPage from "../layout/layers/debug/DebugPage.svelte";
import modalEvent from "../components/modal/modal.store";
import { Action } from "../types/action.enum";
import Bootstrap from "../components/settings/account/Bootstrap.svelte";
import Calendar from "../components/calendar/Calendar.svelte";
import { GlobalEvent } from "../types/event.enum";
import { uiState } from "./uiState/uiState.store";
import BookACall from "../components/cx/BookACall.svelte";
import SupahubEmbed from "../components/cx/supahub/SupahubEmbed.svelte";
import MdShortcuts from "../components/markdown/shortcuts/MdShortcuts.svelte";
import CoverPicker from "../elements/coverPicker/CoverPicker.svelte";
import SurrealLocalViewer from "../components/debug/SurrealLocalViewer.svelte";
import PrivacyPolicy from "../landing/shared/PrivacyPolicy.svelte";
import HashnodeEmbed from "../components/cx/hashnode/HashnodeEmbed.svelte";
import { Embed } from "../types/context.type";

export const globalActions: IAction[] = [
  {
    action: "404",
    type: ActionType.PAGE,
    isMeta: true,
    component: PageError,
    isMenuHidden: true
  },
  {
    action: "error",
    type: ActionType.PAGE,
    isMeta: true,
    component: PageError,
    isMenuHidden: true
  },
  {
    action: "offline",
    type: ActionType.PAGE,
    isMeta: true,
    component: Offline
  },
  {
    action: Action.EXTENSTION_LOGIN,
    type: ActionType.PAGE,
    isMeta: true,
    component: ExtensionLoginStatusPage,
    isMenuHidden: true
  },
  {
    action: "signup",
    component: Signup,
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true
  },
  {
    action: "debuglogs",
    icon: "code",
    type: ActionType.PAGE,
    isMeta: true,
    component: DebugLogs
  },
  {
    action: "web",
    label: "Open web app",
    icon: "link",
    isMeta: true,
    type: ActionType.LINK
  },
  {
    action: Action.GUIDES,
    label: "Guides and docs",
    icon: "ph:book-open-text-light",
    isMeta: true,
    // type: ActionType.LINK
    type: ActionType.FUNCTION,
    fn: async (params?: IActionFnParams) => {
      if (params?.context?.embed === Embed.HANDSET) {
        appStore.runAction(Action.GUIDES + "mobile");
      } else {
        appStore.runAction(Action.GUIDES + "hashnode");
      }
    }
  },
  {
    action: Action.GUIDES + "mobile",
    label: "Guides and docs",
    icon: "ph:book-open-text-light",
    isMeta: true,
    type: ActionType.LINK
  },
  {
    action: Action.GUIDES + "hashnode",
    label: "Guides and docs",
    icon: "ph:book-open-text-light",
    cmdLabel: ["Documentation", "Guides"],
    type: ActionType.MODAL,
    component: HashnodeEmbed,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: "tutorials",
    label: "Tutorials",
    icon: "ph:youtube-logo-light",
    type: ActionType.LINK
  },
  {
    action: "downloads",
    label: "Downloads",
    icon: "ph:download-simple-light",
    type: ActionType.LINK
  },
  {
    action: "chat",
    label: "Chat with us",
    icon: "chatleftright",
    type: ActionType.FUNCTION,
    fn: async () => {
      modalEvent.hide(Action.HELP);
      modalEvent.hide(Action.SETTINGS);
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
    }
  },
  {
    action: "call",
    label: "Book a call",
    icon: "video-camera",
    type: ActionType.MODAL,
    component: BookACall
  },
  {
    action: "faqs",
    label: "FAQs",
    icon: "help",
    type: ActionType.LINK
  },
  {
    action: "discord",
    label: "Join us on discord",
    icon: "ph:discord-logo-light",
    type: ActionType.LINK
  },
  {
    action: "opencollective",
    label: "Support us",
    icon: "gift",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: "twitter",
    label: "Share on socials",
    icon: "megaphone",
    type: ActionType.LINK
  },
  {
    action: "credits",
    get label() {
      return this.modalParams?.title;
    },
    icon: "face-smile",
    isInactive: true,
    type: ActionType.MODAL,
    contentType: ContentType.SPACE_DOC,
    modalParams: {
      title: "Credits",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: "git",
    label: "Star us on git",
    icon: "star",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: Action.PRIVACY_POLICY,
    get label() {
      return this.modalParams?.title;
    },
    icon: "lock-closed",
    type: ActionType.MODAL,
    // contentType: ContentType.SPACE_DOC,
    component: PrivacyPolicy,
    modalParams: {
      title: "Privacy policy",
      layout: {
        size: Size.xl
      }
    }
  },
  {
    action: Action.TERMS_OF_SERVICE,
    get label() {
      return this.modalParams?.title;
    },
    icon: "lock-closed",
    type: ActionType.MODAL,
    contentType: ContentType.SPACE_DOC,
    modalParams: {
      title: "Terms of service",
      layout: {
        size: Size.xl
      }
    }
  },
  {
    action: Action.CHANGELOG,
    label: "What's new",
    icon: "sparkles",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      appStore.runAction(Action.CHANGELOG + "supahub");
    }
  },
  {
    action: Action.CHANGELOG + "supahub",
    label: "What's new",
    icon: "sparkles",
    cmdLabel: ["What's new", "Changelog"],
    type: ActionType.MODAL,
    component: SupahubEmbed,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      },
      componentParams: {
        context: "Changelog"
      }
    }
  },
  {
    action: Action.ROADMAP + "inactive",
    isInactive: true,
    get label() {
      return this.modalParams?.title;
    },
    icon: "map",
    type: ActionType.MODAL,
    contentType: ContentType.SPACE_DOC,
    modalParams: {
      title: "Roadmap",
      layout: {
        size: Size.xl
      }
    }
  },
  {
    action: Action.ROADMAP,
    label: "Roadmap",
    icon: "map",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      appStore.runAction(Action.ROADMAP + "supahub");
    }
  },
  {
    action: Action.ROADMAP + "supahub",
    label: "Roadmap",
    icon: "map",
    type: ActionType.MODAL,
    component: SupahubEmbed,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      },
      componentParams: {
        context: "Roadmap"
      }
    }
  },
  {
    action: "feedback",
    label: "Give feedback",
    icon: "chat-bubble-bottom-center",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: "requestfeature",
    label: "Request a feature",
    icon: "light-bulb",
    type: ActionType.LINK
  },
  {
    action: "report",
    label: "Report an issue",
    icon: "flag",
    type: ActionType.MODAL,
    isInactive: true
  },
  {
    action: Action.MOBILE_TOAST,
    component: ToastModalPortrait,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.xs
      }
    }
  },
  {
    action: Action.EDIT_MODE,
    fn: async () => isInEditMode.toggle(),
    type: ActionType.FUNCTION,
    isMeta: true,
    label: "Edit mode"
  },
  {
    action: Action.HELP,
    label: "Help",
    icon: "help",
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
    action: Action.CMD,
    label: "Command bar",
    component: CommandBar,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: Action.MANUAL_RUN_DBO,
    component: ManualRunDbo,
    type: ActionType.MODAL,
    isMeta: true,
    isMenuHidden: true,
    modalParams: {
      layout: {
        size: Size.sm
      }
    }
  },
  {
    action: Action.TOGGLE_SIDEBAR,
    type: ActionType.FUNCTION,
    label: "Toggle sidebar",
    fn: async () => {
      uiState.toggleSidebar();
    }
  },
  {
    action: "troubleshoot",
    label: "Troubleshoot",
    type: ActionType.PAGE,
    component: DebugPage
  },
  {
    action: "bootstrap",
    type: ActionType.PAGE,
    isMenuHidden: true,
    isMeta: true,
    component: Bootstrap
  },
  {
    action: "calendar",
    label: "Calendar",
    // icon: "calendar-days",
    icon: "ph:calendar-dots-light",
    type: ActionType.PAGE,
    component: Calendar
  },
  {
    action: GlobalEvent.ACTIVATE_SEARCH_BOX,
    label: "Activate search box",
    isMeta: true,
    type: ActionType.EVENT
  },
  {
    action: Action.MARKDOWN_SHORTCUTS,
    label: "Markdown shortcuts",
    component: MdShortcuts,
    type: ActionType.MODAL,
    modalParams: {
      title: "Markdown shortcuts",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: Action.COVER_PICKER,
    component: CoverPicker,
    isMeta: true,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: "surreal-local",
    component: SurrealLocalViewer,
    isMeta: true,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
  }
];

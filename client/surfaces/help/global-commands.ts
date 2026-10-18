import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { ActionType, ContentType } from "@nucleum/client/config/action.type";
import type { IAction, IActionFnParams } from "@nucleum/shared-state/commands/action.type";
import PageError from "@nucleum/surfaces/help/errors/PageError.svelte";
import Offline from "@nucleum/surfaces/help/errors/Offline.svelte";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { intercomId } from "@nucleum/surfaces/help/support/intercom.config";
import Help from "@nucleum/surfaces/help/Help.svelte";
import DebugPage from "@nucleum/surfaces/help/diagnostics/DiagnosticsPage.svelte";
import modalEvent from "@nucleum/shell/overlays/modal.store";
import { Action } from "@nucleum/client/config/action.enum";
import BookACall from "@nucleum/surfaces/help/support/BookACall.svelte";
import DatafnSyncStatus from "@nucleum/surfaces/help/diagnostics/DatafnSyncStatus.svelte";
import { Embed } from "@nucleum/client/runtime/context.type";
import DocusaurusEmbed from "@nucleum/surfaces/help/docs/DocusaurusEmbed.svelte";
import Credits from "@nucleum/surfaces/help/Credits.svelte";
import DatafnLocalStatus from "@nucleum/surfaces/help/diagnostics/DatafnLocalStatus.svelte";
import context from "@nucleum/client/runtime/context.store";

/** Commands owned by help; assembled in application composition. */
export const helpCommands = {
  credits: {
    action: Action.CREDITS,
    label: "Credits",
    icon: "heart",
    type: ActionType.MODAL,
    component: Credits,
    modalParams: {
      title: "Credits & Appreciation",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  404: {
    action: "404",
    type: ActionType.PAGE,
    isMeta: true,
    component: PageError,
    isMenuHidden: true
  },
  error: {
    action: "error",
    type: ActionType.PAGE,
    isMeta: true,
    component: PageError,
    isMenuHidden: true
  },
  offline: {
    action: "offline",
    type: ActionType.PAGE,
    isMeta: true,
    component: Offline
  },
  web: {
    action: "web",
    label: "Open web app",
    icon: "link",
    isMeta: true,
    type: ActionType.LINK
  },
  docs: {
    action: Action.DOCS,
    label: "Guides and docs",
    icon: "book-open",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async (params?: IActionFnParams) => {
      if (
        params?.context?.embed === Embed.HANDSET ||
        params?.context?.embed === Embed.TABLET
      ) {
        requireCommandHost().runAction(Action.DOCS + "mobile");
      } else {
        requireCommandHost().runAction(Action.DOCS + "docusaurus");
      }
    }
  },
  docs_mobile: {
    action: Action.DOCS + "mobile",
    label: "Guides and docs",
    icon: "book-open",
    isMeta: true,
    type: ActionType.LINK
  },
  docs_docusaurus: {
    action: Action.DOCS + "docusaurus",
    label: "Guides and docs",
    icon: "book-open",
    cmdLabel: [
      { variant: "documentation", label: "Documentation" },
      { variant: "guides", label: "Guides" }
    ],
    type: ActionType.MODAL,
    component: DocusaurusEmbed,
    componentParams: {
      context: "docs"
    },
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  tutorials: {
    action: "tutorials",
    label: "Tutorials",
    icon: "youtube",
    type: ActionType.LINK
  },
  downloads: {
    action: "downloads",
    label: "Downloads",
    icon: "download",
    type: ActionType.LINK
  },
  chat: {
    action: "chat",
    label: "Chat with us",
    icon: "chats",
    type: ActionType.FUNCTION,
    isMeta: true,
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
  call: {
    action: "call",
    label: "Book a call",
    icon: "video-conference",
    type: ActionType.MODAL,
    component: BookACall
  },
  faqs: {
    action: "faqs",
    label: "FAQs",
    icon: "question",
    type: ActionType.MODAL,
    handsetBehaviorType: ActionType.LINK,
    component: DocusaurusEmbed,
    componentParams: {
      context: "faqs"
    },
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  changelog: {
    action: Action.CHANGELOG,
    label: "What's new",
    icon: "sparkle",
    cmdLabel: [
      { variant: "whatsNew", label: "What's new" },
      { variant: "changelog", label: "Changelog" }
    ],
    type: ActionType.MODAL,
    handsetBehaviorType: ActionType.LINK,
    component: DocusaurusEmbed,
    componentParams: {
      context: "changelog"
    },
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  roadmap: {
    action: Action.ROADMAP,
    label: "Roadmap",
    icon: "map",
    type: ActionType.MODAL,
    handsetBehaviorType: ActionType.LINK,
    component: DocusaurusEmbed,
    componentParams: {
      context: "roadmap"
    },
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  discord: {
    action: "discord",
    label: "Join us on discord",
    icon: "discord",
    type: ActionType.LINK
  },
  opencollective: {
    action: "opencollective",
    label: "Support us",
    icon: "gift",
    isInactive: true,
    type: ActionType.LINK
  },
  twitter: {
    action: "twitter",
    label: "Twitter",
    icon: "twitter",
    type: ActionType.LINK
  },
  reddit: {
    action: "reddit",
    label: "Reddit",
    icon: "reddit",
    type: ActionType.LINK
  },
  bluesky: {
    action: "bluesky",
    label: "Bluesky",
    icon: "butterfly",
    type: ActionType.LINK
  },
  instagram: {
    action: "instagram",
    label: "Instagram",
    icon: "instagram",
    type: ActionType.LINK
  },
  git: {
    action: "git",
    label: "Star us on git",
    icon: "star",
    isInactive: true,
    type: ActionType.LINK
  },
  privacy_policy: {
    action: Action.PRIVACY_POLICY,
    get label() {
      return this.modalParams?.title;
    },
    icon: "lock",
    type: ActionType.LINK,

    modalParams: {
      title: "Privacy policy",
      layout: {
        size: Size.xl
      }
    }
  },
  terms_of_service: {
    action: Action.TERMS_OF_SERVICE,
    get label() {
      return this.modalParams?.title;
    },
    icon: "lock",
    isMeta: true,
    type: ActionType.LINK,
    contentType: ContentType.SPACE_DOC,
    modalParams: {
      title: "Terms of service",
      layout: {
        size: Size.xl
      }
    }
  },
  terms_of_service_apple: {
    action: Action.TERMS_OF_SERVICE_APPLE,
    isMeta: true,
    type: ActionType.LINK
  },
  feedback: {
    action: "feedback",
    label: "Give feedback",
    icon: "chat-three",
    isInactive: true,
    type: ActionType.LINK
  },
  requestfeature: {
    action: "requestfeature",
    label: "Request a feature",
    icon: "lightbulb",
    type: ActionType.LINK
  },
  report: {
    action: "report",
    label: "Report an issue",
    cmdLabel: [
      { variant: "report", label: "Report an issue" },
      { variant: "feedback", label: "Give feedback" }
    ],
    icon: "flag",
    type: ActionType.LINK
  },
  help: {
    action: Action.HELP,
    label: "Help",
    icon: "help",
    type: ActionType.MODAL,
    component: Help,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true
      }
    }
  },
  troubleshoot: {
    action: "troubleshoot",
    label: "Troubleshoot",
    type: ActionType.MODAL,
    component: DebugPage,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
  },
  dexie_console: {
    action: "dexie-console",
    component: DatafnLocalStatus,
    isMeta: true,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
  },
  signaldb_console: {
    action: "signaldb-console",
    component: DatafnSyncStatus,
    isMeta: true,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
  }
} satisfies Record<string, IAction | IAction[]>;

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
import { ResourceActionType } from "../components/flux/resourceStores/resource.type";
import { resourceAction } from "../components/flux/resourceStores/resource.utils";
import { Resource } from "../components/flux/resourceStores/resource.enum";
import CreateCollection from "$lib/client/components/collection/CreateCollection.svelte";
import PropertiesEditor from "$lib/client/components/collection/properties/PropertiesEditor.svelte";
import CreateCombination from "$lib/client/components/combination/CreateCombination.svelte";
import { linker } from "../products/memotron/linking/link.store";
import { ResourceError } from "$lib/client/components/error/errors";
import { ResourceErrorCode } from "$lib/client/components/error/error.type";
import CollectionTitleLabelPart from "$lib/client/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
import Collection from "$lib/client/components/collection/Collection.svelte";
import PropertyConfig from "$lib/client/components/collection/properties/propertyConfig/PropertyConfig.svelte";
import { logger } from "../components/debug/logger.client";
import { toasts } from "./notification.store";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
import LinkSearchResultItem from "$lib/client/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
import { SearchStore } from "../components/record/record.store";
import { recentsStore } from "../components/record/recent.store";
import { isValidString } from "$lib/shared/utils/text.utils";
import ResourceBrowser from "../components/library/resourceBrowser/ResourceBrowser.svelte";
import UserPlan from "../components/subscription/UserPlan.svelte";
import InactivePlan from "../components/subscription/InactivePlan.svelte";
import { ButtonVariant } from "../types/button.type";
import CreateTask from "$lib/client/components/tasks/CreateTask.svelte";
import Task from "../components/tasks/Task.svelte";
import TaskTitleLabelPart from "../components/tasks/TaskTitleLabelPart.svelte";
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
      if (
        params?.context?.embed === Embed.HANDSET ||
        params?.context?.embed === Embed.TABLET
      ) {
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
    cmdLabel: [
      { variant: "documentation", label: "Documentation" },
      { variant: "guides", label: "Guides" }
    ],
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
    icon: "ph:chats-light",
    type: ActionType.FUNCTION,
    isInactive: true,
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
    icon: "ph:video-conference-light",
    type: ActionType.MODAL,
    component: BookACall
  },
  {
    action: "faqs",
    label: "FAQs",
    icon: "ph:question-light",
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
    icon: "ph:gift-light",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: "twitter",
    label: "Twitter",
    icon: "ph:x-logo-light",
    type: ActionType.LINK
  },
  {
    action: "reddit",
    label: "Reddit",
    icon: "ph:reddit-logo-light",
    type: ActionType.LINK
  },
  {
    action: "bluesky",
    label: "Bluesky",
    icon: "ph:butterfly-light",
    type: ActionType.LINK
  },
  {
    action: "instagram",
    label: "Instagram",
    icon: "ph:instagram-logo-light",
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
    icon: "ph:star-light",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: Action.PRIVACY_POLICY,
    get label() {
      return this.modalParams?.title;
    },
    icon: "ph:lock-simple-light",
    type: ActionType.LINK,
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
    icon: "ph:lock-simple-light",
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
  {
    action: Action.CHANGELOG + "mobile",
    label: "What's new",
    icon: "ph:sparkle-light",
    isMeta: true,
    type: ActionType.LINK
  },
  {
    action: Action.CHANGELOG,
    label: "What's new",
    icon: "ph:sparkle-light",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async (params?: IActionFnParams) => {
      if (
        params?.context?.embed === Embed.HANDSET ||
        params?.context?.embed === Embed.TABLET
      ) {
        appStore.runAction(Action.CHANGELOG + "mobile");
      } else {
        appStore.runAction(Action.CHANGELOG + "supahub");
      }
    }
  },
  {
    action: Action.CHANGELOG + "supahub",
    label: "What's new",
    icon: "ph:sparkle-light",
    cmdLabel: [
      { variant: "whatsNew", label: "What's new" },
      { variant: "changelog", label: "Changelog" }
    ],
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
    action: Action.ROADMAP + "mobile",
    label: "Roadmap",
    icon: "ph:map-trifold-light",
    isMeta: true,
    type: ActionType.LINK
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
    icon: "ph:map-trifold-light",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async (params?: IActionFnParams) => {
      if (
        params?.context?.embed === Embed.HANDSET ||
        params?.context?.embed === Embed.TABLET
      ) {
        appStore.runAction(Action.ROADMAP + "mobile");
      } else {
        appStore.runAction(Action.ROADMAP + "supahub");
      }
    }
  },
  {
    action: Action.ROADMAP + "supahub",
    label: "Roadmap",
    icon: "ph:map-trifold-light",
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
    icon: "ph:chat-centered-dots-light",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: "requestfeature",
    label: "Request a feature",
    icon: "ph:lightbulb-light",
    type: ActionType.LINK
  },
  {
    action: "report",
    label: "Report an issue",
    icon: "ph:flag-light",
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
        ignoreSafeArea: true,
        isShowCantileverClose: true
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
    icon: "ph:calendar-light",
    isInactive: true,
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
  },
  {
    action: Action.GO_BACK,
    label: "Go back",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      appStore.goBack();
    }
  },
  {
    action: Action.GO_FORWARD,
    label: "Go forward",
    isMeta: true,
    type: ActionType.FUNCTION,
    fn: async () => {
      appStore.goForward();
    }
  },
  {
    action: resourceAction(Resource.collection, ResourceActionType.CREATE),
    component: CreateCollection,
    label: "Create a new collection",
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: resourceAction(Resource.property, ResourceActionType.EDIT),
    component: PropertiesEditor,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: resourceAction(Resource.combination, ResourceActionType.CREATE),
    component: CreateCombination,
    label: "Create a new combination",
    type: ActionType.MODAL,
    isInactive: true,
    modalParams: {
      title: "Create a new combination",
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: Resource.collection,
    type: ActionType.MODAL,
    component: Collection,
    resourceLabelRenderer: CollectionTitleLabelPart,
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
    action: resourceAction(Resource.collection, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Collections",
    icon: "ph:brackets-round-light",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.collection
    },
    loadingComponent: NodeLoadingPulse
  },
  {
    action: resourceAction(Resource.tag, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Tags",
    icon: "ph:tag-light",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.tag
    }
  },
  {
    action: Action.ADD_ITEM_TO_COLLECTION,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Add node to collection",
    isMeta: true,
    searchActionParams: {
      placeholder: "select a node",
      searchResultComponent: LinkSearchResultItem,
      searchCallback: async (query: string, componentParams?: any) => {
        //TODO - resource.type based on collection resource type
        const searchStore = new SearchStore(Resource.node);
        if (isValidString(query)) {
          return searchStore.select({
            resource: Resource.node,
            searchQuery: query,
            limit: 50
          });
        } else {
          return recentsStore.resolve({ type: Resource.node });
        }
      },
      callback: async (id: string, label?: string, componentParams?: any) => {
        try {
          if (!componentParams?.id) {
            toasts.error();
            return;
          }
          const result = await linker.link(id, componentParams.id, {
            context: componentParams.id.toString()
          });
          logger.log({
            at: "addNodeToCollection",
            id,
            label,
            componentParams,
            result
          });
          if (!result) {
            toasts.error();
            return;
          }
          toasts.success(`**${label}** added to collection`);
        } catch (e) {
          logger.error(e);
          if (e instanceof ResourceError) {
            if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
              toasts.error("Already added to collection");
            } else {
              toasts.error();
            }
          } else {
            toasts.error();
          }
        }
      }
    }
  },
  {
    action: "propertyConfig",
    type: ActionType.INLINE,
    isMeta: true,
    component: PropertyConfig
  },
  {
    action: Action.USER_PLAN,
    type: ActionType.MODAL,
    isMeta: true,
    component: UserPlan,
    modalParams: {
      layout: {
        size: Size.full,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: Action.INACTIVE_PLAN,
    type: ActionType.MODAL,
    isMeta: true,
    component: InactivePlan,
    modalParams: {
      isDismissable: false,
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal,
        primaryAction: {
          label: "Upgrade now",
          icon: "ph:sparkle-light",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            appStore.runAction(Action.USER_PLAN);
          }
        },
        secondaryAction: {
          label: "I'll do it later",
          icon: "ph:clock-light",
          variant: ButtonVariant.SECONDARY,
          callback: async () => {
            modalEvent.hide(Action.INACTIVE_PLAN);
          }
        }
      }
    }
  },
  {
    action: resourceAction(Resource.task, ResourceActionType.CREATE),
    cmdLabel: "Create a new task",
    component: CreateTask,
    type: ActionType.MODAL,
    modalParams: {
      title: "Create a new task",
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical
      }
    }
  },
  {
    action: Resource.task,
    type: ActionType.MODAL,
    component: Task,
    resourceLabelRenderer: TaskTitleLabelPart,
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
    action: resourceAction(Resource.task, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Tasks",
    icon: "ph:check-circle-light",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.task
    },
    loadingComponent: NodeLoadingPulse
  }
];

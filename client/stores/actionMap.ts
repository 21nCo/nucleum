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
import ExtensionLoginStatusPage from "../components/settings/ExtensionLoginStatusPage.svelte";
import DebugPage from "../layout/layers/debug/DebugPage.svelte";
import modalEvent from "../components/modal/modal.store";
import { Action } from "../types/action.enum";
import Bootstrap from "../components/settings/account/Bootstrap.svelte";
import Calendar from "../components/calendar/Calendar.svelte";
import { GlobalEvent } from "../types/event.enum";
import { uiState } from "./uiState/uiState.store";
import BookACall from "../components/cx/BookACall.svelte";
import MdShortcuts from "../components/markdown/shortcuts/MdShortcuts.svelte";
import CoverPicker from "../elements/coverPicker/CoverPicker.svelte";
import SurrealLocalViewer from "../components/debug/SurrealLocalViewer.svelte";
import SignalDBViewer from "../components/debug/SignalDBViewer.svelte";
import PrivacyPolicy from "../landing/shared/PrivacyPolicy.svelte";
import CalendarSettings from "../components/calendar/settings/CalendarSettings.svelte";
import { Embed } from "../types/context.type";
import {
  ResourceAccessMode,
  ResourceActionType,
  type IMultiSelectStore
} from "../components/flux/resourceStores/resource.type";
import {
  determineResourceType,
  resolveResourceIcon,
  resourceAction,
  resourceCacheComponentKey
} from "../components/flux/resourceStores/resource.utils";
import { Resource } from "../components/flux/resourceStores/resource.enum";
import CreateCollection from "$lib/client/components/collection/CreateCollection.svelte";
import PropertiesEditor from "$lib/client/components/collection/properties/PropertiesEditor.svelte";
import CreateCombination from "$lib/client/components/combination/CreateCombination.svelte";
import { linker } from "../products/memotron/linking/link.store";
import { ResourceError } from "$lib/client/components/error/errors";
import { ResourceErrorCode } from "$lib/client/components/error/error.type";
import CollectionTitleLabelPart from "$lib/client/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
import PropertyConfig from "$lib/client/components/collection/properties/propertyConfig/PropertyConfig.svelte";
import { logger } from "../components/debug/logger.client";
import { toasts } from "./notification.store";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
import LinkSearchResultItem from "$lib/client/products/memotron/common/linkbox/LinkSearchResultItemDummy.svelte";
import { SearchStore } from "../components/record/record.store";
import { recentsStore } from "../components/record/recent.store";
import { isValidString } from "$lib/shared/utils/text.utils";
import ResourceBrowser from "../components/library/resourceBrowser/ResourceBrowser.svelte";
import UserPlan from "../components/subscription/UserPlan.svelte";
import InactivePlan from "../components/subscription/InactivePlan.svelte";
import { ButtonVariant } from "../types/button.type";
import PaymentRedirect from "../components/subscription/PaymentRedirect.svelte";
import PlanOnboarding from "../components/subscription/PlanOnboarding.svelte";
import type { IRecordId } from "$lib/client/types/data.type";
import UserBilling from "../components/subscription/UserBilling.svelte";
import UserPlanCancellation from "../components/subscription/UserPlanCancellation.svelte";
import DocusaurusEmbed from "../components/cx/docusaurus/DocusaurusEmbed.svelte";
import ResourceSearchModal from "../products/memotron/library/search/ResourceSearchModal.svelte";
import Collection from "../components/collection/DummyCollection.svelte";
import AppLoadingView from "../layout/paint/AppLoadingView.svelte";
import SimpleDigitalClock from "../products/pointron/clocks/SimpleDigitalClock.svelte";
import Test from "../components/Test.svelte";
import SampleCalendarItemThumbnail from "../components/calendar/column/timeline/SampleCalendarItemThumbnail.svelte";
import FocusCalendarEntryThumbnail from "../components/calendar/column/timeline/focusEntry/FocusCalendarEntryThumbnail.svelte";
import CalendarDayModal from "../components/calendar/column/CalendarDayModal.svelte";
import HotKeys from "../components/markdown/shortcuts/HotKeys.svelte";
import HistoryModal from "../components/calendar/HistoryModal.svelte";
import Credits from "$lib/client/components/help/Credits.svelte";
import { resolveResourceStore } from "../components/flux/resourceStores/store.resolver";
import CollectionCache from "../components/collection/CollectionCache.svelte";
import DataSettings from "../components/settings/DataSettings.svelte";
import DexieConsole from "../components/debug/DexieConsole.svelte";

export const globalActions: IAction[] = [
  {
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
        appStore.runAction(Action.DOCS + "mobile");
      } else {
        appStore.runAction(Action.DOCS + "docusaurus");
      }
    }
  },
  {
    action: Action.DOCS + "mobile",
    label: "Guides and docs",
    icon: "book-open",
    isMeta: true,
    type: ActionType.LINK
  },
  {
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
  {
    action: "tutorials",
    label: "Tutorials",
    icon: "youtube-logo",
    type: ActionType.LINK
  },
  {
    action: "downloads",
    label: "Downloads",
    icon: "download",
    type: ActionType.LINK
  },
  {
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
  {
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
  {
    action: Action.ROADMAP,
    label: "Roadmap",
    icon: "map-trifold",
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

  {
    action: "discord",
    label: "Join us on discord",
    icon: "discord-logo",
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
    label: "Twitter",
    icon: "x-logo",
    type: ActionType.LINK
  },
  {
    action: "reddit",
    label: "Reddit",
    icon: "reddit-logo",
    type: ActionType.LINK
  },
  {
    action: "bluesky",
    label: "Bluesky",
    icon: "butterfly",
    type: ActionType.LINK
  },
  {
    action: "instagram",
    label: "Instagram",
    icon: "instagram-logo",
    type: ActionType.LINK
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
    icon: "lock",
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
  {
    action: Action.TERMS_OF_SERVICE_APPLE,
    isMeta: true,
    type: ActionType.LINK
  },
  {
    action: "feedback",
    label: "Give feedback",
    icon: "chat-teardrop-text",
    isInactive: true,
    type: ActionType.LINK
  },
  {
    action: "requestfeature",
    label: "Request a feature",
    icon: "lightbulb",
    type: ActionType.LINK
  },
  {
    action: "report",
    label: "Report an issue",
    cmdLabel: [
      { variant: "report", label: "Report an issue" },
      { variant: "feedback", label: "Give feedback" }
    ],
    icon: "flag",
    type: ActionType.LINK
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
    type: ActionType.MODAL,
    component: DebugPage,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal
      }
    }
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
    icon: "calendar",
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
    action: Action.HOT_KEYS,
    label: "See hot key shortcuts",
    component: HotKeys,
    type: ActionType.MODAL,
    modalParams: {
      title: "Hot key shortcuts",
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
    action: "dexie-console",
    component: DexieConsole,
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
    action: "signaldb-console",
    component: SignalDBViewer,
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
    icon: "collection",
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
    icon: "tag",
    isInactive: true,
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.tag
    }
  },
  {
    action: Action.ADD_ITEM_TO_COLLECTION,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Add to collection",
    isMeta: true,
    searchActionParams: {
      placeholder: "select an item to add to this collection",
      searchResultComponent: LinkSearchResultItem,
      searchCallback: async (query: string, componentParams?: any) => {
        const resource = componentParams?.resource ?? Resource.node;
        const searchStore = new SearchStore(resource);
        if (isValidString(query)) {
          return searchStore.select({
            resource,
            searchQuery: query,
            limit: 50
          });
        } else {
          return recentsStore.resolve({ type: resource });
        }
      },
      callback: async (item: any, componentParams?: any) => {
        try {
          if (!componentParams?.id) {
            toasts.error();
            return;
          }
          const result = await linker.link(item.id, componentParams.id, {
            context: componentParams.id.toString()
          });
          const store = resolveResourceStore(componentParams?.resource);
          await store.modify(item.id, {
            collections: [...(item.collections ?? []), componentParams.id]
          });
          logger.log({
            at: "addNodeToCollection",
            id: item.id,
            label: item.label,
            componentParams,
            result
          });
          if (!result) {
            toasts.error();
            return;
          }
          toasts.success(`**${item.label}** added to collection`);
        } catch (e) {
          logger.error({ at: "addNodeToCollection", error: e });
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
          icon: "sparkle",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            appStore.runAction(Action.USER_PLAN);
          }
        },
        secondaryAction: {
          label: "Chat with us",
          icon: "chat-teardrop-text",
          variant: ButtonVariant.SECONDARY,
          callback: async () => {
            appStore.runAction("chat");
          }
        }
      }
    }
  },
  {
    action: "pay",
    type: ActionType.PAGE,
    component: PaymentRedirect
  },
  {
    action: Action.PLAN_ONBOARDING,
    isMeta: true,
    type: ActionType.MODAL,
    component: PlanOnboarding,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: Action.USER_BILLING,
    label: "Billing",
    icon: "wallet",
    type: ActionType.MODAL,
    component: UserBilling,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: Action.USER_PLAN_CANCELATION,
    isMeta: true,
    type: ActionType.MODAL,
    component: UserPlanCancellation,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical
      }
    }
  },
  {
    action: Action.BULK_LINK,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Link to a node or add to a collection",
    isMeta: true,
    searchActionParams: {
      searchCallback: async (search: string, componentParams?: any) => {
        const result = await new SearchStore().searchForLinking(search, {
          resource: componentParams?.resource
        });
        return result;
      },
      placeholder: (componentParams?: any) => {
        return componentParams?.resource === Resource.collection
          ? "select a collection"
          : componentParams?.resource === Resource.node
            ? "select a node"
            : "select a node or a collection";
      },
      searchResultComponent: LinkSearchResultItem,
      callback: async (
        item: any,
        componentParams?: {
          multiSelectStore?: IMultiSelectStore;
          items?: IRecordId[];
        }
      ) => {
        try {
          const items =
            componentParams?.multiSelectStore?.get() ?? componentParams?.items;
          const context = componentParams?.multiSelectStore?.context;
          if (!items) {
            toasts.error("Something went wrong. Please try again later.", {
              closeProgressId: "bulklink"
            });
            return;
          }
          const resourceType = determineResourceType(item.id);
          toasts.showProgress(
            "bulklink",
            resourceType === Resource.collection
              ? "Adding to collection"
              : "Linking to node"
          );
          const result = await linker.bulkLink(items, item.id, resourceType, {
            context: context?.accessPoint
          });
          if (resourceType === Resource.collection) {
            const itemType = determineResourceType(items[0]);
            const store = resolveResourceStore(itemType);
            const toModify = await store.selectMany({
              filters: {
                id: items.map((x) => x.toString())
              }
            });
            await Promise.all(
              toModify.map((x: any) =>
                store.modify(x.id, {
                  collections: [...(x.collections ?? []), item.id]
                })
              )
            );
          }
          logger.log({
            at: "bulkLink",
            id: item.id,
            resourceType,
            label: item.label,
            items,
            result
          });
          if (!result) {
            toasts.error("Something went wrong. Please try again later.", {
              closeProgressId: "bulklink"
            });
            return;
          }
          componentParams?.multiSelectStore?.reset();
          if (resourceType === Resource.collection) {
            toasts.success(
              `**${items.length}** ${
                items.length > 1 ? "items" : "item"
              } added to collection ${item.label ? `**${item.label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          } else {
            toasts.success(
              `**${items.length}** ${
                items.length > 1 ? "items" : "item"
              } linked to node ${item.label ? `**${item.label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          }
        } catch (e) {
          logger.error({ at: "bulkLink", error: e });
          toasts.error("Something went wrong. Please try again later.", {
            closeProgressId: "bulklink"
          });
        }
      }
    }
  },
  {
    action: Action.GLOBAL_SEARCH,
    component: ResourceSearchModal,
    label: "Search resources",
    // type: ActionType.MODAL,
    type: ActionType.RESOURCE,
    accessMode: ResourceAccessMode.POP,
    modalParams: {
      layout: {
        orientation: Orientation.Horizontal,
        size: Size.xl,
        ignoreSafeArea: true,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: "appLoading",
    isMeta: true,
    label: "Test app loading",
    type: ActionType.PAGE,
    isMenuHidden: true,
    component: AppLoadingView,
    componentParams: {
      message: "First login detected. Copying data from database",
      subMessage: "Please wait...",
      duration: 50
    }
  },
  {
    action: "simpleDigitalClock",
    type: ActionType.PAGE,
    isMeta: true,
    component: SimpleDigitalClock
  },
  {
    action: "test",
    type: ActionType.PAGE,
    isMeta: true,
    component: Test
  },
  {
    action: "sampleCalendarItemThumbnail",
    type: ActionType.INLINE,
    isMeta: true,
    component: SampleCalendarItemThumbnail
  },
  {
    action: "focusTimelineEntry",
    type: ActionType.INLINE,
    isMeta: true,
    component: FocusCalendarEntryThumbnail
  },
  {
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
  {
    action: Action.HISTORY,
    label: "History",
    icon: "clock",
    type: ActionType.RESOURCE,
    component: HistoryModal,
    modalParams: {
      title: "History",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: resourceCacheComponentKey(Resource.collection),
    type: ActionType.CACHE,
    component: CollectionCache
  },
  {
    action: Action.DATA_SETTINGS,
    type: ActionType.MODAL,
    label: "Data Settings",
    icon: "database",
    component: DataSettings,
    hideContext: [Embed.HANDSET],
    modalParams: {
      title: "Data Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: Action.CALENDAR_SETTINGS,
    type: ActionType.MODAL,
    label: "Calendar Settings",
    icon: "sliders",
    component: CalendarSettings,
    modalParams: {
      title: "Calendar Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  }
];

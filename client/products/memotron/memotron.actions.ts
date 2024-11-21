import { ActionType, type IAction } from "$lib/client/types/action.type";
import { Orientation } from "$lib/client/types/direction.enum";
import { Size } from "$lib/client/types/size.enum";
import Capture from "$lib/client/products/memotron/capture/Capture.svelte";
import Node from "$lib/client/products/memotron/node/Node.svelte";
import Journal from "$lib/client/products/memotron/journal/Journal.svelte";
import JournalModalViewer from "$lib/client/products/memotron/journal/JournalModalViewer.svelte";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import ProductFeatureWheel from "$lib/client/components/blank/ProductFeatureWheel.svelte";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import PropertyConfig from "$lib/client/products/memotron/collection/properties/propertyConfig/PropertyConfig.svelte";
import Library from "$lib/client/products/memotron/library/Library.svelte";
import TestHome from "$local/TestHome.svelte";
import CreateCollection from "$lib/client/products/memotron/collection/CreateCollection.svelte";
import PropertiesEditor from "$lib/client/products/memotron/collection/properties/PropertiesEditor.svelte";
import { MemotronAction } from "./memotronAction.enum";
import {
  ResourceAccessMode,
  ResourceActionType
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  determineResourceType,
  resourceAction
} from "$lib/client/components/flux/resourceStores/resource.utils";
import CollectionBrowser from "$lib/client/products/memotron/collection/CollectionBrowser.svelte";
import NodeBrowser from "$lib/client/products/memotron/node/NodeBrowser.svelte";
import ResourceSearchModal from "./library/search/ResourceSearchModal.svelte";
import Collection from "./collection/Collection.svelte";
import { Action } from "$lib/client/types/action.enum";
import PasteConfirmationModal from "./capture/PasteConfirmationModal.svelte";
import { linker } from "./linking/link.store";
import { toasts } from "$lib/client/stores/notification.store";
import { logger } from "$lib/client/components/debug/logger.client";
import LinkTagsControlPanel from "./linking/LinkTagsControlPanel.svelte";
import Chat from "$lib/client/products/memotron/taco/Chat.svelte";
import CaptureDnD from "./capture/CaptureDnD.svelte";
import MemotronHome from "./home/MemotronHome.svelte";
import MemotronOnboarding from "./base/MemotronOnboarding.svelte";
import LinkSearchResultItem from "./common/linkbox/LinkSearchResultItem.svelte";
import NodeTitleLabelPart from "./node/title/NodeTitleLabelPart.svelte";
import MemotronGreenUse from "./base/MemotronGreenUse.svelte";
import GlobalGraph from "./graph/GlobalGraph.svelte";
import CalloutSettings from "$lib/client/components/markdown/callout/CalloutSettings.svelte";
import CreateCombination from "./combination/CreateCombination.svelte";
import MemotronDataSettings from "./settings/MemotronDataSettings.svelte";
import CollectionTitleLabelPart from "./collection/title/CollectionTitleLabelPart.svelte";
import { Embed } from "$lib/client/types/context.type";
import { SearchStore } from "./memotron.store";

export const memotronActions: IAction[] = [
  {
    action: MemotronAction.OPEN_CHAT,
    component: Chat,
    type: ActionType.MODAL,
    isInactive: true,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowClose: true
      },
      isOnRight: true,
      title: "Taco"
    }
  },
  {
    action: MemotronAction.CAPTURE,
    component: Capture,
    label: "Capture",
    icon: "capture",
    type: ActionType.RESOURCE,
    accessMode: ResourceAccessMode.POP,
    // isRenderAsPageInPortrait: true,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: false
      }
    }
  },
  {
    action: MemotronAction.CAPTURE_DND,
    component: CaptureDnD,
    isMeta: true,
    type: ActionType.RESOURCE,
    accessMode: ResourceAccessMode.POP,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: false
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
    action: MemotronAction.EDIT_COLLECTION_PROPERTIES,
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
    action: MemotronAction.JOURNAL_MODAL_VIEWER,
    component: JournalModalViewer,
    type: ActionType.MODAL,
    isInactive: true,
    modalParams: {
      layout: {
        size: Size.full,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: MemotronAction.SERENDIPITY,
    component: ComingSoonView,
    type: ActionType.MODAL,
    isInactive: true,
    modalParams: {
      layout: {
        size: Size.xl,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: MemotronAction.HISTORY,
    component: ComingSoonView,
    type: ActionType.MODAL,
    modalParams: {
      layout: {
        size: Size.xl,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: Resource.node,
    component: Node,
    label: "Node",
    isMeta: true,
    type: ActionType.MODAL,
    loadingComponent: NodeLoadingPulse,
    resourceLabelRenderer: NodeTitleLabelPart,
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
    component: CollectionBrowser,
    label: "Collections",
    icon: "ph:circles-four-light",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse
  },
  {
    action: resourceAction(Resource.node, ResourceActionType.BROWSE),
    component: NodeBrowser,
    label: "Nodes",
    icon: "node",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse
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
    action: Resource.combination,
    type: ActionType.MODAL,
    component: ComingSoonView
  },
  {
    action: "journal",
    type: ActionType.PAGE,
    label: "Journal",
    isInactive: true,
    icon: "calendar-days",
    component: Journal
  },
  {
    action: MemotronAction.LIBRARY,
    label: "Library",
    // icon: "globe-alt",
    icon: "ph:globe",
    component: Library,
    type: ActionType.PAGE,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: "rewind",
    type: ActionType.MODAL,
    label: "Rewind",
    isInactive: true,
    icon: "sync",
    component: TestHome
  },
  {
    action: "serendipity",
    type: ActionType.MODAL,
    label: "Serendipity",
    isInactive: true,
    icon: "light-bulb",
    component: TestHome
  },
  {
    action: "fw",
    label: "Feature Wheel",
    type: ActionType.PAGE,
    isMenuHidden: true,
    isMeta: true,
    component: ProductFeatureWheel,
    modalParams: {
      layout: {
        size: Size.full,
        ignoreSafeArea: true
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
    action: MemotronAction.PASTE_CONFIRMATION,
    type: ActionType.MODAL,
    isMeta: true,
    component: PasteConfirmationModal,
    modalParams: {
      title: "Paste Confirmation",
      layout: {
        size: Size.sm
      }
    }
  },
  {
    action: MemotronAction.ADD_NODE_TO_COLLECTION,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Add node to collection",
    isMeta: true,
    searchActionParams: {
      searchStoreId: Resource.node,
      placeholder: "select a node",
      searchResultComponent: LinkSearchResultItem,
      callback: async (id: string, label?: string, componentParams?: any) => {
        if (!componentParams?.id) {
          toasts.error("Something went wrong. Please try again later.");
          return;
        }
        const result = await linker.link(id, componentParams.id);
        logger.log({
          at: "addNodeToCollection",
          id,
          label,
          componentParams,
          result
        });
        if (!result) {
          toasts.error("Something went wrong. Please try again later.");
          return;
        }
        toasts.success(`**${label}** added to collection`);
      }
    }
  },
  {
    action: MemotronAction.BULK_LINK,
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
      callback: async (id: string, label?: string, componentParams?: any) => {
        try {
          const items =
            componentParams?.multiSelectStore?.get() ?? componentParams?.items;
          if (!items) {
            toasts.error("Something went wrong. Please try again later.", {
              closeProgressId: "bulklink"
            });
            return;
          }
          const resourceType = determineResourceType(id);
          toasts.showProgress(
            "bulklink",
            resourceType === Resource.collection
              ? "Adding to collection"
              : "Linking to node"
          );
          const result = await linker.bulkLink(items, id, resourceType);
          logger.log({
            at: "bulkLink",
            id,
            resourceType,
            label,
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
              } added to collection ${label ? `**${label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          } else {
            toasts.success(
              `**${items.length}** ${
                items.length > 1 ? "items" : "item"
              } linked to node ${label ? `**${label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          }
        } catch (e) {
          logger.error(e);
          toasts.error("Something went wrong. Please try again later.", {
            closeProgressId: "bulklink"
          });
        }
      }
    }
  },
  {
    action: resourceAction(Resource.linkTag, ResourceActionType.BROWSE),
    type: ActionType.MODAL,
    label: "Link Tags",
    icon: "ph:tag",
    component: LinkTagsControlPanel,
    modalParams: {
      title: "Link Tags",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: "home",
    type: ActionType.PAGE,
    label: "Home",
    isInactive: true,
    icon: "ph:house",
    component: MemotronHome
  },
  {
    action: "graph",
    type: ActionType.PAGE,
    label: "Graph",
    icon: "ph:graph",
    component: GlobalGraph
  },
  {
    action: "onboarding",
    type: ActionType.PAGE,
    isMeta: true,
    label: "Onboarding",
    icon: "ph:rocket",
    component: MemotronOnboarding
  },
  {
    action: "green",
    type: ActionType.PAGE,
    isMeta: true,
    label: "Green usage",
    icon: "ph:leaf-light",
    component: MemotronGreenUse
  },
  {
    action: MemotronAction.CALLOUT_SETTINGS,
    type: ActionType.MODAL,
    label: "Callout Settings",
    component: CalloutSettings,
    modalParams: {
      title: "Callout Settings",
      layout: {
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: MemotronAction.DATA_SETTINGS,
    type: ActionType.MODAL,
    label: "Data Settings",
    icon: "ph:database",
    component: MemotronDataSettings,
    hideContext: [Embed.HANDSET],
    modalParams: {
      title: "Data Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
  }
];

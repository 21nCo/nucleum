import { ActionType, type IAction } from "$lib/client/types/action.type";
import { Orientation } from "$lib/client/types/direction.enum";
import { Size } from "$lib/client/types/size.enum";
import Capture from "$lib/client/products/memotron/capture/Capture.svelte";
import Node from "$lib/client/products/memotron/node/Node.svelte";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import MemotronLibrary from "$lib/client/products/memotron/library/MemotronLibrary.svelte";
import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
import {
  ResourceAccessMode,
  ResourceActionType
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  resourceAction,
  resourceCacheComponentKey
} from "$lib/client/components/flux/resourceStores/resource.utils";
import PasteConfirmationModal from "./capture/PasteConfirmationModal.svelte";
import Chat from "$lib/client/products/memotron/taco/Chat.svelte";
import CaptureDnD from "./capture/CaptureDnD.svelte";
import MemotronHome from "./home/MemotronHome.svelte";
import MemotronOnboarding from "./base/MemotronOnboarding.svelte";
import NodeTitleLabelPart from "./node/title/NodeTitleLabelPart.svelte";
import MemotronGreenUse from "./base/MemotronGreenUse.svelte";
import CalloutSettings from "$lib/client/components/markdown/callout/CalloutSettings.svelte";
import ResourceBrowser from "$lib/client/components/library/resourceBrowser/ResourceBrowser.svelte";
import FeatureWheel from "$lib/client/components/featureWheel/FeatureWheel.svelte";
import ResourceCache from "$lib/client/components/record/ResourceCache.svelte";
import MemotronOverview from "./overview/MemotronOverview.svelte";
import { Action } from "$lib/client/types/action.enum";

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
    action: resourceAction(Resource.node, ResourceActionType.CREATE),
    component: Capture,
    label: "Capture",
    // icon: "ph:plus-circle-light",
    icon: "mynaui:plus-hexagon",
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
    action: MemotronAction.CAPTURE_SECONDARY,
    component: Capture,
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
    action: resourceAction(Resource.node, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Nodes",
    icon: "ph:hexagon-light",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse,
    componentParams: {
      resource: Resource.node
    }
  },
  {
    action: MemotronAction.LIBRARY,
    label: "Library",
    icon: "ph:stack-light",
    component: MemotronLibrary,
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
    component: ComingSoonView
  },
  {
    action: "serendipity",
    type: ActionType.MODAL,
    label: "Serendipity",
    isInactive: true,
    icon: "light-bulb",
    component: ComingSoonView
  },
  {
    action: "fw",
    label: "Feature Wheel",
    type: ActionType.PAGE,
    isMenuHidden: true,
    isMeta: true,
    component: FeatureWheel,
    modalParams: {
      layout: {
        size: Size.full,
        ignoreSafeArea: true
      }
    }
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
    action: resourceAction(Resource.relation, ResourceActionType.BROWSE),
    type: ActionType.PAGE,
    label: "Relations",
    icon: "ph:link-simple-horizontal-light",
    component: ResourceBrowser,
    componentParams: {
      resource: Resource.relation
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
    action: Action.OVERVIEW,
    type: ActionType.PAGE,
    label: "Overview",
    // icon: "ph:squares-four-light",
    icon: "heroicons:rectangle-group",
    component: MemotronOverview
  },
  {
    action: "onboarding",
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true,
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
        orientation: Orientation.Vertical,
        size: Size.lg
      }
    }
  },
  {
    action: resourceCacheComponentKey(Resource.node),
    type: ActionType.CACHE,
    component: ResourceCache,
    componentParams: {
      resource: Resource.node
    }
  },
  {
    action: resourceCacheComponentKey(Resource.relation),
    type: ActionType.CACHE,
    component: ResourceCache,
    componentParams: {
      resource: Resource.relation
    }
  }
];

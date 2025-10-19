import { ActionType, type IAction } from "@21n/types/action.type";
import { Orientation, Placement } from "@21n/types/direction.enum";
import { Size } from "@21n/types/size.enum";
import Capture from "@21n/products/memotron/capture/Capture.svelte";
import Node from "@21n/products/memotron/node/Node.svelte";
import NodeLoadingPulse from "@21n/elements/feedback/animations/NodeLoadingPulse.svelte";
import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import MemotronLibrary from "@21n/products/memotron/library/MemotronLibrary.svelte";
import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
import {
  ResourceAccessMode,
  ResourceActionType
} from "@21n/components/flux/resourceStores/resource.type";
import {
  resourceAction,
  resourceCacheComponentKey
} from "@21n/components/flux/resourceStores/resource.utils";
import PasteConfirmationModal from "@21n/products/memotron/capture/PasteConfirmationModal.svelte";
import Chat from "@21n/products/memotron/taco/Chat.svelte";
import CaptureDnD from "@21n/products/memotron/capture/CaptureDnD.svelte";
import MemotronOnboarding from "@21n/products/memotron/base/MemotronOnboarding.svelte";
import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
import MemotronGreenUse from "@21n/products/memotron/base/MemotronGreenUse.svelte";
import CalloutSettings from "@21n/components/markdown/callout/CalloutSettings.svelte";
import ResourceBrowser from "@21n/components/library/resourceBrowser/ResourceBrowser.svelte";
import FeatureWheel from "@21n/components/featureWheel/FeatureWheel.svelte";
import ResourceCache from "@21n/components/record/ResourceCache.svelte";
import MemotronOverview from "@21n/products/memotron/overview/MemotronOverview.svelte";
import { Action } from "@21n/types/action.enum";
import ImportAppData from "@21n/products/memotron/import/ImportAppData.svelte";
import MemotronImportSettings from "@21n/products/memotron/import/MemotronImportSettings.svelte";
import MemotronHomeOnMobile from "@21n/products/memotron/home/MemotronHomeOnMobile.svelte";
import EditCaptureShortcuts from "@21n/products/memotron/capture/EditCaptureShortcuts.svelte";
import CaptureSettings from "@21n/products/memotron/capture/CaptureSettings.svelte";
import LinkTagsControlPanel from "@21n/products/memotron/linking/LinkTagsControlPanel.svelte";
import LibraryPanelContentResolver from "@21n/components/library/LibraryPanelContentResolver.svelte";
import PreviewImageUploader from "@21n/products/memotron/node/PreviewImageUploader.svelte";
import NodeSettings from "@21n/products/memotron/node/NodeSettings.svelte";

export const memotronActions: IAction[] = [
  {
    action: MemotronAction.PREVIEW_IMAGE_UPLOADER,
    type: ActionType.MODAL,
    isMeta: true,
    component: PreviewImageUploader,
    modalParams: {
      layout: {
        size: Size.md,
        orientation: Orientation.Vertical,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: Action.MOBILEHOME,
    component: MemotronHomeOnMobile,
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true
  },
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
        isShowClose: true,
        alignment: Placement.Right
      },
      title: "Taco"
    }
  },
  {
    action: resourceAction(Resource.node, ResourceActionType.CREATE),
    component: Capture,
    label: "Capture",
    icon: "mynaui:plus-hexagon",
    type: ActionType.RESOURCE,
    accessMode: ResourceAccessMode.POP,
    modalParams: {
      layout: {
        size: Size.full,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
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
    icon: "hexagon",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse,
    componentParams: {
      resource: Resource.node
    }
  },
  {
    action: Resource.combination,
    type: ActionType.MODAL,
    component: ComingSoonView
  },
  {
    action: MemotronAction.LIBRARY,
    label: "Library",
    icon: "stack",
    component: LibraryPanelContentResolver,
    panel: MemotronLibrary,
    type: ActionType.PAGE,
    componentParams: {
      defaultResource: Resource.node
    },
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal
      }
    }
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
      layout: {
        ignoreSafeArea: true,
        size: Size.md
      }
    }
  },
  {
    action: resourceAction(Resource.relation, ResourceActionType.BROWSE),
    type: ActionType.PAGE,
    label: "Relations",
    icon: "relation",
    component: ResourceBrowser,
    componentParams: {
      resource: Resource.relation
    }
  },
  {
    action: MemotronAction.RELATIONS_AS_SETTINGS,
    type: ActionType.PAGE,
    label: "Relations",
    isMeta: true,
    icon: "relation",
    component: LinkTagsControlPanel
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
        size: Size.lg,
        isOveriddenFooter: true
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
  },
  {
    action: MemotronAction.IMPORT_APP_DATA,
    isMeta: true,
    type: ActionType.MODAL,
    component: ImportAppData,
    modalParams: {
      layout: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: Action.IMPORT_FROM_OTHER_APPS,
    label: "Import from other apps",
    type: ActionType.MODAL,
    component: MemotronImportSettings,
    modalParams: {
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: MemotronAction.EDIT_CAPTURE_SHORTCUTS,
    label: "Edit Capture Shortcuts",
    type: ActionType.MODAL,
    component: EditCaptureShortcuts,
    modalParams: {
      title: "Capture Shortcuts",
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: MemotronAction.CAPTURE_SETTINGS,
    label: "Capture Settings",
    type: ActionType.MODAL,
    component: CaptureSettings,
    modalParams: {
      title: "Capture Settings",
      layout: {
        size: Size.lg,
        orientation: Orientation.Vertical,
        isShowCantileverClose: true
      }
    }
  },
  {
    action: MemotronAction.NODE_SETTINGS,
    label: "Node Settings",
    type: ActionType.MODAL,
    component: NodeSettings,
    modalParams: {
      title: "Node Settings",
      layout: {
        size: Size.md,
        orientation: Orientation.Vertical,
        isShowCantileverClose: true
      }
    }
  }
];

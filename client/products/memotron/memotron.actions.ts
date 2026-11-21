import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Orientation, Placement } from "@21n/ui/elements/direction.enum";
import { Size } from "@21n/ui/elements/size.enum";
import NodeLoadingPulse from "@21n/ui/elements/feedback/animations/NodeLoadingPulse.svelte";
import ComingSoonView from "@21n/ui/elements/ComingSoonView.svelte";
import { Resource } from "@nucleum/datafn/resource.enum";
import { MemotronAction } from "@nucleum/features/memory/memory-action.enum";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import NodeTitleLabelPart from "@nucleum/features/memory/node/title/NodeTitleLabelPart.svelte";
import Capture from "@nucleum/features/memory/capture/Capture.svelte";
import CaptureDnD from "@nucleum/features/memory/capture/CaptureDnD.svelte";
import PasteConfirmationModal from "@nucleum/features/memory/capture/PasteConfirmationModal.svelte";
import Node from "@nucleum/features/memory/node/Node.svelte";
import PreviewImageUploader from "@nucleum/features/memory/node/PreviewImageUploader.svelte";
import { Action } from "@nucleum/client/config/action.enum";
import { appMenuActionLabelsByAction } from "@nucleum/client/config/product-nav.config";
import { createPageViewActions } from "@nucleum/shared-state/commands/page-view-actions";
import { createLibraryViewActions } from "@nucleum/surfaces/library/library-route";
import { memotronLibraryResources } from "@nucleum/products/memotron/library/memotron-library";
import { resolveMemotronOverviewViewSegments } from "@nucleum/products/memotron/overview/memotron-overview-views";

const loadMemotronLibrary = () =>
  import("@nucleum/products/memotron/library/MemotronLibrary.svelte");
const loadResourceBrowser = () =>
  import("@nucleum/surfaces/library/resourceBrowser/ResourceBrowser.svelte");

const libraryAction: IAction = {
  action: MemotronAction.LIBRARY,
  label: appMenuActionLabelsByAction[Action.LIBRARY],
  icon: "library",
  loadComponent: () =>
    import("@nucleum/surfaces/library/LibraryPanelContentResolver.svelte"),
  panel: loadMemotronLibrary,
  type: ActionType.PAGE,
  componentParams: {
    defaultResource: Resource.node,
    resources: memotronLibraryResources
  },
  modalParams: {
    layout: {
      size: Size.lg,
      orientation: Orientation.Horizontal
    }
  }
};

const libraryPortraitAction: IAction = {
  action: Action.LIBRARY_PORTRAIT,
  label: appMenuActionLabelsByAction[Action.LIBRARY_PORTRAIT],
  icon: "library",
  loadComponent: loadMemotronLibrary,
  type: ActionType.PAGE
};

const overviewAction: IAction = {
  action: Action.OVERVIEW,
  type: ActionType.PAGE,
  label: appMenuActionLabelsByAction[Action.OVERVIEW],
  icon: "overview",
  loadComponent: () =>
    import("@nucleum/products/memotron/overview/MemotronOverview.svelte")
};

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
    loadComponent: () =>
      import("@nucleum/products/memotron/home/MemotronHomeOnMobile.svelte"),
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true
  },
  {
    action: MemotronAction.OPEN_CHAT,
    loadComponent: () =>
      import("@nucleum/products/memotron/taco/Chat.svelte"),
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
    label:
      appMenuActionLabelsByAction[
        resourceAction(Resource.node, ResourceActionType.CREATE)
      ],
    icon: "mynaui:plus-hexagon",
    type: ActionType.LIVE,
    accessMode: AccessMode.OVERLAY,
    liveActionParams: {
      isOpeningBehaviorConfigurable: true
    }
  },
  {
    action: MemotronAction.CAPTURE_DND,
    component: CaptureDnD,
    isMeta: true,
    type: ActionType.RESOURCE,
    accessMode: AccessMode.PAGE,
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
    accessMode: AccessMode.PAGE,
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
    loadComponent: loadResourceBrowser,
    label: "Nodes",
    icon: "hexagon",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse,
    componentParams: {
      resource: Resource.node
    }
  },
  libraryAction,
  libraryPortraitAction,
  ...createLibraryViewActions(libraryPortraitAction, memotronLibraryResources, {
    isMeta: true
  }),
  ...createLibraryViewActions(libraryAction, memotronLibraryResources),
  {
    action: "serendipity",
    type: ActionType.MODAL,
    label: "Serendipity",
    isInactive: true,
    icon: "light-bulb",
    component: ComingSoonView
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
    loadComponent: loadResourceBrowser,
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
    loadComponent: () =>
      import("@nucleum/features/memory/linking/LinkTagsControlPanel.svelte")
  },
  overviewAction,
  ...createPageViewActions(
    overviewAction,
    resolveMemotronOverviewViewSegments()
  ),
  {
    action: "onboarding",
    type: ActionType.PAGE,
    isMeta: true,
    isMenuHidden: true,
    label: "Onboarding",
    icon: "ph:rocket",
    loadComponent: () =>
      import("@nucleum/products/memotron/base/MemotronOnboarding.svelte")
  },
  {
    action: "green",
    type: ActionType.PAGE,
    isMeta: true,
    label: "Green usage",
    icon: "ph:leaf-light",
    loadComponent: () =>
      import("@nucleum/products/memotron/base/MemotronGreenUse.svelte")
  },
  {
    action: MemotronAction.CALLOUT_SETTINGS,
    type: ActionType.MODAL,
    label: "Callout Settings",
    loadComponent: () =>
      import("@nucleum/features/memory/markdown/callout/CalloutSettings.svelte"),
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
    action: MemotronAction.IMPORT_APP_DATA,
    isMeta: true,
    type: ActionType.MODAL,
    loadComponent: () =>
      import("@nucleum/products/memotron/import/ImportAppData.svelte"),
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
    loadComponent: () =>
      import("@nucleum/products/memotron/import/MemotronImportSettings.svelte"),
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
    loadComponent: () =>
      import("@nucleum/features/memory/capture/EditCaptureShortcuts.svelte"),
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
    loadComponent: () =>
      import("@nucleum/features/memory/capture/CaptureSettings.svelte"),
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
    loadComponent: () =>
      import("@nucleum/features/memory/node/NodeSettings.svelte"),
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

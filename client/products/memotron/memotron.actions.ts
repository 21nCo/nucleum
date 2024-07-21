import { ActionType, type IAction } from "$lib/client/types/action.type";
import { Orientation } from "$lib/client/types/direction.enum";
import { Size } from "$lib/client/types/size.enum";
import Capture from "$lib/client/products/memotron/capture/Capture.svelte";
import NodeView from "$lib/client/products/memotron/node/NodeView.svelte";
import Journal from "$lib/client/products/memotron/journal/Journal.svelte";
import JournalModalViewer from "$lib/client/products/memotron/journal/JournalModalViewer.svelte";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import ProductFeatureWheel from "$lib/client/components/blank/ProductFeatureWheel.svelte";
import Curation from "$lib/client/products/memotron/curation/Curation.svelte";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import PropertyConfig from "$lib/client/products/memotron/collection/properties/propertyConfig/PropertyConfig.svelte";
import TypeEditor from "$lib/client/products/memotron/collection/properties/TypeEditor.svelte";
import Library from "$lib/client/products/memotron/library/Library.svelte";
import TestHome from "$local/TestHome.svelte";
import CreateCollection from "$lib/client/products/memotron/collection/CreateCollection.svelte";
import PropertiesEditor from "$lib/client/products/memotron/collection/properties/PropertiesEditor.svelte";
import { MemotronAction } from "./memotronAction.enum";
export const memotronActions: IAction[] = [
  {
    action: MemotronAction.CAPTURE,
    component: Capture,
    label: "Capture",
    icon: "capture",
    type: ActionType.PAGE,
    modalParams: {
      layout: {
        size: Size.full,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: MemotronAction.CREATE_COLLECTION,
    component: CreateCollection,
    label: "Create a new collection",
    type: ActionType.MODAL,
    modalParams: {
      title: "Create collection",
      layout: {
        size: Size.xl,
        orientation: Orientation.Vertical
      }
    }
  },
  {
    action: MemotronAction.EDIT_COLLECTION_PROPERTIES,
    component: PropertiesEditor,
    type: ActionType.MODAL,
    isMeta: true,
    modalParams: {
      title: "Edit properties",
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: MemotronAction.CREATE_TYPE,
    component: TypeEditor,
    label: "Create a new type",
    type: ActionType.MODAL,
    modalParams: {
      title: "Create type",
      layout: {
        orientation: Orientation.Horizontal,
        size: Size.xl
      }
    }
  },
  {
    action: MemotronAction.JOURNAL_MODAL_VIEWER,
    component: JournalModalViewer,
    type: ActionType.MODAL,
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
    component: NodeView,
    label: "Node",
    type: ActionType.MODAL,
    loadingComponent: NodeLoadingPulse,
    modalParams: {
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: Resource.curation,
    component: Curation,
    label: "Curations",
    icon: "curation",
    type: ActionType.PAGE,
    loadingComponent: NodeLoadingPulse,
    modalParams: {
      layout: {
        size: Size.full,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: Resource.nodelinks,
    type: ActionType.MODAL,
    component: Curation
  },
  {
    action: Resource.collection,
    type: ActionType.MODAL,
    component: Curation
  },
  {
    action: Resource.combination,
    type: ActionType.MODAL,
    component: Curation
  },
  {
    action: "journal",
    type: ActionType.PAGE,
    label: "Journal",
    icon: "calendar-days",
    component: Journal
  },
  {
    action: "nodes",
    type: ActionType.PAGE,
    label: "Nodes",
    icon: "node",
    component: TestHome
  },
  {
    action: MemotronAction.LIBRARY,
    label: "Library",
    icon: "globe-alt",
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
    icon: "sync",
    component: TestHome
  },
  {
    action: "serendipity",
    type: ActionType.MODAL,
    label: "Serendipity",
    icon: "light-bulb",
    component: TestHome
  },
  {
    action: "fw",
    label: "Feature Wheel",
    type: ActionType.PAGE,
    isMenuHidden: true,
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
  }
];

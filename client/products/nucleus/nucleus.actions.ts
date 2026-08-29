import { Action } from "@21n/types/action.enum";
import { ActionType, type IAction } from "@21n/types/action.type";
import { memotronActions } from "@21n/products/memotron/memotron.actions";
import { pointronActions } from "@21n/products/pointron/pointron.actions";
import NucleusLibrary from "@21n/products/nucleus/NucleusLibrary.svelte";
import NucleusOverview from "@21n/products/nucleus/overview/NucleusOverview.svelte";
import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
import LibraryPanelContentResolver from "@21n/components/library/LibraryPanelContentResolver.svelte";
import { Resource } from "@21n/data/datafn/resource.enum";
import NucleusOverviewPanel from "@21n/products/nucleus/overview/NucleusOverviewPanel.svelte";
import { AccessMode, ResourceActionType } from "@21n/data/datafn/resource.type";
import { resourceAction } from "@21n/data/datafn/resource.utils";
import { appMenuActionLabelsByAction } from "@21n/products/product-nav.config";

const actionsToFilterInSub = [Action.LIBRARY, Action.OVERVIEW];

export const nucleusActions: IAction[] = [
  ...memotronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  ...pointronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  {
    action: Action.LIBRARY,
    label: appMenuActionLabelsByAction[Action.LIBRARY],
    icon: "library",
    component: LibraryPanelContentResolver,
    panel: NucleusLibrary,
    type: ActionType.PAGE,
    componentParams: {
      defaultResource: Resource.collection
    }
  },
  {
    action: Action.OVERVIEW,
    label: appMenuActionLabelsByAction[Action.OVERVIEW],
    icon: "overview",
    component: NucleusOverview,
    // panel: NucleusOverviewPanel,
    type: ActionType.PAGE
  },
  {
    action: Action.HOME,
    label: appMenuActionLabelsByAction[Action.HOME],
    icon: "home",
    component: ComingSoonView,
    type: ActionType.PAGE
  },
  {
    action: Action.FEED,
    label: "Feed",
    icon: "feed",
    component: ComingSoonView,
    type: ActionType.LIVE,
    accessMode: AccessMode.RIGHT,
    liveActionParams: {
      isOpeningBehaviorConfigurable: true
    }
  },
  {
    action: resourceAction(Resource.space, ResourceActionType.BROWSE),
    label:
      appMenuActionLabelsByAction[
        resourceAction(Resource.space, ResourceActionType.BROWSE)
      ],
    icon: "combination",
    type: ActionType.PAGE
  }
];

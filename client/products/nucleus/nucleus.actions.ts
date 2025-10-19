import { Action } from "@21n/types/action.enum";
import { ActionType, type IAction } from "@21n/types/action.type";
import { memotronActions } from "@21n/products/memotron/memotron.actions";
import { pointronActions } from "@21n/products/pointron/pointron.actions";
import NucleusLibrary from "@21n/products/nucleus/NucleusLibrary.svelte";
import NucleusOverview from "@21n/products/nucleus/overview/NucleusOverview.svelte";
import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
import LibraryPanelContentResolver from "@21n/components/library/LibraryPanelContentResolver.svelte";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import NucleusOverviewPanel from "@21n/products/nucleus/overview/NucleusOverviewPanel.svelte";

const actionsToFilterInSub = [
  Action.LIBRARY,
  Action.OVERVIEW,
  PointronAction.FOCUS,
  PointronAction.FOCUS_MODAL
];

const focusModal = pointronActions.find(
  (action) => action.action === PointronAction.FOCUS_MODAL
);

export const nucleusActions: IAction[] = [
  ...memotronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  ...pointronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  {
    type: ActionType.MODAL,
    ...(focusModal ? focusModal : {}),
    action: PointronAction.FOCUS
  },
  {
    action: Action.LIBRARY,
    label: "Library",
    icon: "stack",
    component: LibraryPanelContentResolver,
    panel: NucleusLibrary,
    type: ActionType.PAGE,
    componentParams: {
      defaultResource: Resource.collection
    }
  },
  {
    action: Action.OVERVIEW,
    label: "Overview",
    icon: "heroicons:rectangle-group",
    component: NucleusOverview,
    panel: NucleusOverviewPanel,
    type: ActionType.PAGE
  },
  {
    action: Action.HOME,
    label: "Home",
    icon: "home",
    component: ComingSoonView,
    type: ActionType.PAGE
  }
];

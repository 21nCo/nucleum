import { Action } from "$lib/client/types/action.enum";
import { ActionType, type IAction } from "$lib/client/types/action.type";
import { memotronActions } from "$lib/client/products/memotron/memotron.actions";
import { pointronActions } from "$lib/client/products/pointron/pointron.actions";
import NucleusLibrary from "./NucleusLibrary.svelte";
import NucleusOverview from "./overview/NucleusOverview.svelte";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
import LibraryPanelContentResolver from "$lib/client/components/library/LibraryPanelContentResolver.svelte";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import NucleusOverviewPanel from "./overview/NucleusOverviewPanel.svelte";

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

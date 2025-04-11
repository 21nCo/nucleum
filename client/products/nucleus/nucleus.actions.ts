import { Action } from "$lib/client/types/action.enum";
import { ActionType, type IAction } from "$lib/client/types/action.type";
import { memotronActions } from "$lib/client/products/memotron/memotron.actions";
import { pointronActions } from "$lib/client/products/pointron/pointron.actions";
import NucleusLibrary from "./NucleusLibrary.svelte";

const actionsToFilterInSub = [Action.LIBRARY];

export const nucleusActions: IAction[] = [
  ...memotronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  ...pointronActions.filter(
    (action) => !actionsToFilterInSub.includes(action.action as Action)
  ),
  {
    action: Action.LIBRARY,
    label: "Library",
    icon: "ph:stack-light",
    component: NucleusLibrary,
    type: ActionType.PAGE
  }
];

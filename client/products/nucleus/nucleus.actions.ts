import { Action } from "$lib/client/types/action.enum";
import { ActionType, type IAction } from "$lib/client/types/action.type";
import { memotronActions } from "$lib/client/products/memotron/memotron.actions";
import { pointronActions } from "$lib/client/products/pointron/pointron.actions";
import NucleusLibrary from "./NucleusLibrary.svelte";
import NucleusOverview from "./overview/NucleusOverview.svelte";
import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
import CreateCombination from "$lib/client/components/combination/CreateCombination.svelte";
import { Orientation } from "$lib/client/types/direction.enum";
import { Size } from "$lib/client/types/size.enum";
import LinkSearchResultItem from "../memotron/common/linkbox/LinkSearchResultItem.svelte";
import { SearchStore } from "$lib/client/components/record/record.store";
import { isValidString } from "$lib/shared/utils/text.utils";
import { recentsStore } from "$lib/client/components/record/recent.store";
import { toasts } from "$lib/client/stores/notification.store";
import { resolveResourceStore } from "$lib/client/components/flux/resourceStores/store.resolver";
import { logger } from "$lib/client/components/debug/logger.client";
import Combination from "$lib/client/components/combination/Combination.svelte";
import ResourceBrowser from "$lib/client/components/library/resourceBrowser/ResourceBrowser.svelte";
import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";

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
    icon: "ph:stack-light",
    component: NucleusLibrary,
    type: ActionType.PAGE
  },
  {
    action: Action.OVERVIEW,
    label: "Overview",
    icon: "heroicons:rectangle-group",
    component: NucleusOverview,
    type: ActionType.PAGE
  },
  {
    action: resourceAction(Resource.combination, ResourceActionType.CREATE),
    component: CreateCombination,
    label: "Create a new combination",
    type: ActionType.MODAL,
    // isInactive: true,
    modalParams: {
      title: "Create a new combination",
      layout: {
        size: Size.md,
        orientation: Orientation.Horizontal
      }
    }
  },
  {
    action: resourceAction(Resource.combination, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Combinations",
    icon: "ph:bounding-box-light",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.combination
    },
    loadingComponent: NodeLoadingPulse
  },
  {
    action: Action.ADD_ITEM_TO_COMBINATION,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Add to combination",
    isMeta: true,
    searchActionParams: {
      placeholder: "select an item to add to this combination",
      searchResultComponent: LinkSearchResultItem,
      searchCallback: async (query: string, componentParams?: any) => {
        const resources = componentParams?.resources ?? [Resource.node];
        const searchStore = new SearchStore();

        if (isValidString(query)) {
          return searchStore.searchForLinking(query, {
            resource: resources.length === 1 ? resources[0] : undefined
          });
        } else {
          return recentsStore.resolve({ type: resources[0] });
        }
      },
      callback: async (item: any, componentParams?: any) => {
        try {
          if (!componentParams?.id) {
            toasts.error();
            return;
          }

          const combinationStore = resolveResourceStore(Resource.combination);
          const combination = await combinationStore.select(componentParams.id);
          if (!combination) {
            toasts.error("Combination not found");
            return;
          }

          const newItem = { id: item.id };
          const updatedItems = [...(combination.items || []), newItem];
          const result = await combinationStore.modify(componentParams.id, {
            items: updatedItems
          });

          if (!result) {
            toasts.error();
            return;
          }
          toasts.success(`**${item.label}** added to combination`);
        } catch (e) {
          logger.error({ at: "addItemToCombination", error: e });
          toasts.error("Failed to add item to combination");
        }
      }
    }
  },
  {
    action: Resource.combination,
    type: ActionType.MODAL,
    component: Combination,
    modalParams: {
      layout: {
        size: Size.xxl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true,
        isShowCantileverClose: true,
        isShowBackButton: true
      }
    }
  }
];

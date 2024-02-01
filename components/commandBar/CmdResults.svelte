<script lang="ts">
  import { localActions } from "$lib/local/stores/localActionMap";
  import { actions } from "$lib/tidy/layout/actionMap";
  import { modalEvent, userPreferences } from "$lib/tidy/stores/app.store";
  import { ActionType } from "$lib/tidy/types/action.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import { runAction } from "$lib/tidy/utils/utils";
  import { createEventDispatcher } from "svelte";
  import CmdResultItem from "./CmdResultItem.svelte";
  const dispatch = createEventDispatcher();
  export let search: string = "";
  let allActions: any[] = [];
  let filteredActions: any[] = [];
  let selectedAction: string = "";
  loadAllActions();
  loadDefaultFilteredActions();
  $: if (search) {
    filteredActions = search
      ? allActions.filter((x) =>
          x.label.toLowerCase().includes(search.toLowerCase())
        )
      : allActions;
    selectedAction = filteredActions?.[0]?.action;
  } else {
    loadDefaultFilteredActions();
    selectedAction = filteredActions?.[0]?.action;
  }
  export function moveSelection(direction: "up" | "down") {
    const currentIndex = filteredActions?.findIndex(
      (x) => x.action === selectedAction
    );
    let nextIndex = currentIndex;
    if (direction === "down") {
      nextIndex = Math.min(currentIndex + 1);
      if (nextIndex === filteredActions?.length) {
        nextIndex = 0;
      }
    } else if (direction === "up") {
      nextIndex = Math.max(currentIndex - 1, -1);
      if (nextIndex === -1) {
        nextIndex = filteredActions?.length - 1;
      }
    }
    selectedAction = filteredActions?.[nextIndex]?.action;
  }
  export function select() {
    if (selectedAction) {
      const action = filteredActions.find((x) => x.action === selectedAction);
      if (action && action.type === ActionType.SEARCH_CMD) {
        dispatch("searchAction", action);
      } else {
        dispatch("close");
        runAction(selectedAction);
      }
      let recentCommands = isValidArrayWithData(
        $userPreferences.recentCommands
      );
      if (recentCommands) {
        if (recentCommands.includes(selectedAction)) {
          recentCommands = recentCommands.filter((x) => x !== selectedAction);
        }
        recentCommands.unshift(selectedAction);
        recentCommands = recentCommands.slice(0, 5);
      } else {
        recentCommands = [selectedAction];
      }
      $userPreferences.recentCommands = recentCommands;
    }
  }

  function loadAllActions() {
    const rawActions = [...localActions, ...actions];
    allActions = rawActions.filter(
      (action) =>
        action.label &&
        !action.isInactive &&
        !(
          action.type === ActionType.META ||
          action.type === ActionType.META_MODAL ||
          action.type === ActionType.META_PAGE
        ) &&
        (action.cmdBarPreCondition ? action.cmdBarPreCondition() : true)
    );
    allActions = allActions.map((x) => {
      if (x.cmdLabel) {
        return x;
      }
      return {
        ...x,
        cmdLabel: x.label
      };
    });
  }
  function loadDefaultFilteredActions() {
    const recentCommands = isValidArrayWithData(
      $userPreferences.recentCommands
    );
    if (recentCommands) {
      filteredActions = allActions.filter(
        (x) => !recentCommands.includes(x.action)
      );
      const recentActions = recentCommands
        .map((x) => allActions.find((y) => y.action === x))
        .filter((x) => x);
      filteredActions = [...recentActions, ...filteredActions];
    } else {
      filteredActions = allActions;
    }
  }
</script>

{#each filteredActions as action}
  <CmdResultItem
    {search}
    {action}
    isActive={selectedAction === action.action}
    on:click={() => {
      selectedAction = action.action;
      select();
    }}
  />
{/each}

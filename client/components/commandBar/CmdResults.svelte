<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { ActionType } from "$lib/client/types/action.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  import CmdResultItem from "./CmdResultItem.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
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
          x.cmdLabel.toLowerCase().includes(search.toLowerCase())
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
        appStore.runAction(selectedAction);
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
    const rawActions = $appStore.actions;
    const primitive = rawActions.filter(
      (action) =>
        action.label &&
        !action.isInactive &&
        !action.isMeta &&
        (action.preCondition ? action.preCondition() : true)
    );
    primitive.forEach((action) => {
      if (!action.cmdLabel) {
        action.cmdLabel = action.label;
      }
      if (action.cmdLabel && typeof action.cmdLabel === "string") {
        allActions.push(action);
      } else if (
        action.cmdLabel &&
        typeof action.cmdLabel != "string" &&
        action.cmdLabel.length > 0
      ) {
        allActions.push(
          ...action.cmdLabel.map((x) => {
            return {
              ...action,
              cmdLabel: x
            };
          })
        );
      }
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

{#each filteredActions as action, index}
  <CmdResultItem
    {search}
    {action}
    {index}
    isActive={selectedAction === action.action}
    on:click={() => {
      selectedAction = action.action;
      select();
    }}
  />
{/each}

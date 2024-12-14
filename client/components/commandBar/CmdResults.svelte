<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { ActionType } from "$lib/client/types/action.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  import CmdResultItem from "./CmdResultItem.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import type { ICommandAction } from "./cmd.type";
  const dispatch = createEventDispatcher();
  export let search: string = "";
  let allActions: ICommandAction[] = [];
  let filteredActions: ICommandAction[] = [];
  let selectedAction: ICommandAction | null = null;
  loadAllActions();
  loadDefaultFilteredActions();
  $: if (search) {
    filteredActions = search
      ? allActions.filter((x) =>
          x.cmdLabel.toLowerCase().includes(search.toLowerCase())
        )
      : allActions;
    selectedAction = filteredActions?.[0];
  } else {
    loadDefaultFilteredActions();
    selectedAction = filteredActions?.[0];
  }
  export function moveSelection(direction: "up" | "down") {
    const currentIndex = filteredActions?.findIndex(findInList(selectedAction));
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
    selectedAction = filteredActions?.[nextIndex];
  }
  export function select() {
    if (selectedAction) {
      const action = filteredActions.find(findInList(selectedAction));
      if (action && action.type === ActionType.SEARCH_CMD) {
        dispatch("searchAction", action);
      } else {
        dispatch("close");
        appStore.runAction(selectedAction.action, {
          componentParams: {
            isCmdBarLaunch: true
          }
        });
      }
      let recentCommands = isValidArrayWithData(
        $userPreferences.recentCommands
      );
      if (recentCommands) {
        if (recentCommands.some(findInList(selectedAction))) {
          recentCommands = recentCommands.filter(
            (x) => !findInList(selectedAction)(x)
          );
        }
        recentCommands.unshift({
          action: selectedAction.action,
          variant: selectedAction.variant
        });
        recentCommands = recentCommands.slice(0, 5);
      } else {
        recentCommands = [
          {
            action: selectedAction.action,
            variant: selectedAction.variant
          }
        ];
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
        allActions.push({
          ...action,
          cmdLabel: action.cmdLabel
        });
      } else if (
        action.cmdLabel &&
        typeof action.cmdLabel != "string" &&
        action.cmdLabel.length > 0
      ) {
        allActions.push(
          ...action.cmdLabel.map((x) => {
            return {
              ...action,
              variant: x.variant,
              cmdLabel: x.label
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
        (x) => !recentCommands.some(findInList(x))
      );
      const recentActions = recentCommands
        .map((x) => allActions.find(findInList(x)))
        .filter((x) => x);
      filteredActions = [...recentActions, ...filteredActions];
    } else {
      filteredActions = allActions;
    }
  }

  function isSameAction(toCheck: ICommandAction | null, item: ICommandAction) {
    if (
      !toCheck ||
      typeof toCheck !== "object" ||
      !item ||
      typeof item !== "object"
    )
      return false;
    if (toCheck.variant) {
      return item.action === toCheck.action && item.variant === toCheck.variant;
    }
    return item.action === toCheck.action;
  }

  function findInList(toCheck: ICommandAction | null) {
    if (!toCheck) return () => false;
    return (item: ICommandAction) => {
      return isSameAction(toCheck, item);
    };
  }
</script>

{#each filteredActions as action, index}
  <CmdResultItem
    {search}
    {action}
    {index}
    isActive={isSameAction(selectedAction, action)}
    on:click={() => {
      selectedAction = action;
      select();
    }}
  />
{/each}

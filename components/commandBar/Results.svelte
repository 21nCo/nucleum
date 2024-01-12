<script lang="ts">
  import { localActions } from "$lib/local/stores/localActionMap";
  import { actions } from "$lib/tidy/layout/actionMap";
  import {
    modalEvent,
    userPreferences,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import { isValidArray } from "$lib/tidy/utils/obj.utils";
  import ResultItem from "./ResultItem.svelte";
  export let search: string = "";
  let allActions: any[] = [];
  let filteredActions: any[] = [];
  let selectedAction: string = "";
  loadAllActions();
  loadDefaultActions();
  $: if (search) {
    filteredActions = search
      ? allActions.filter((x) =>
          x.label.toLowerCase().includes(search.toLowerCase())
        )
      : allActions;
    selectedAction = filteredActions?.[0]?.action;
  } else {
    loadDefaultActions();
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
      const action = allActions.find((x) => x.action === selectedAction);
      if (action.type === "navigation") {
        windowObject.gotoPath(action.path ?? "/" + action.action);
        closeCmdBar();
      } else {
        action.fn();
      }
      let recentCommands = isValidArray($userPreferences.recentCommands);
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
  function closeCmdBar() {
    modalEvent.notify({
      isShow: false,
      path: "cmd"
    });
  }
  function mapAction(action: any) {
    if (!action.label || action.link) {
      return;
    } else if (action.fn) {
      return { ...action, type: "action" };
    } else {
      return { ...action, type: "navigation" };
    }
  }
  function loadAllActions() {
    const rawActions = [...localActions, ...actions];
    allActions = rawActions.map((x) => mapAction(x)).filter((x) => x);
  }
  function loadDefaultActions() {
    const recentCommands = isValidArray($userPreferences.recentCommands);
    if (recentCommands) {
      filteredActions = allActions.filter(
        (x) => !recentCommands.includes(x.action)
      );
      const recentActions = recentCommands.map((x) =>
        allActions.find((y) => y.action === x)
      );
      filteredActions = [...recentActions, ...filteredActions];
    } else {
      filteredActions = allActions;
    }
  }
</script>

{#each filteredActions as action}
  <ResultItem
    {search}
    {action}
    isActive={selectedAction === action.action}
    on:click={() => {
      selectedAction = action.action;
      select();
    }}
  />
{/each}

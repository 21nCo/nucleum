<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Autocomplete from "$lib/client/elements/autocomplete/Autocomplete.svelte";
  import { GoalPersistence } from "$lib/client/products/pointron/goals/goal.persistence";
  import type { IGoal } from "$lib/client/types/pointron/goal.type";
  import { onMount } from "svelte";
  import type { AutocompleteListItemType } from "$lib/client/types/autocompleteListItem.type";
  import { Size } from "$lib/client/types/size.enum";
  import { currentGoal } from "$lib/client/products/pointron/goals/goal.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";

  export let id: string; // id of the goal to be converted to subgoal

  let inputValue: string = "";
  let selectedGoalId: string = "";

  let allGoals: AutocompleteListItemType[] = [];
  let tempGoals: AutocompleteListItemType[] = [];

  let value: AutocompleteListItemType;

  const goalPersistance = new GoalPersistence();

  async function onConvert() {
    if (!selectedGoalId) return;
    const response = await goalPersistance.convertToSubGoal(id, selectedGoalId);
    currentGoal.propagateChangesTemp();
    onClose();
  }

  function handleFocus() {
    tempGoals = allGoals;
  }

  function handleGoalSelect({ detail }: CustomEvent) {
    inputValue = detail.title;
    selectedGoalId = detail.id;
    onConvert();
  }

  function onClose() {
    modalEvent.hide();
  }

  onMount(() => {
    // console.log("hello");
    //setAllGoals();
  });
</script>

<div class="bg-transparent">
  <Autocomplete
    inputClassList={`text-fgs2 bg-bgs3 ${
      $view.isPortrait ? `` : `min-w-[20rem]`
    }`}
    on:focus={handleFocus}
    on:list-item-click={handleGoalSelect}
    on:reset={onClose}
    options={tempGoals}
    listContainerStyle={`position:relative;`}
    bind:inputValue
    bind:value
  />
</div>

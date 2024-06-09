<script lang="ts">
  import ChipsAutocomplete from "$lib/client/elements/autocomplete/ChipsAutocomplete.svelte";
  import type { AutocompleteListItemType } from "$lib/client/types/autocompleteListItem.type";
  import { ChipVariant } from "$lib/client/types/chipVariant.enum";
  import GoalColorPickerWithPreview from "../GoalColorPickerWithPreview.svelte";
  import { onMount } from "svelte";
  import { newGoalStore } from "$lib/client/components/pointron/goals/goal.store";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import {
    pointronEvents,
    tagStore
  } from "$lib/client/components/pointron/local.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import type { PointronEvent } from "$lib/client/types/pointron/pointronEvent.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  function getUsedColors() {
    return [];
  }
  onMount(async () => {
    usedColors = getUsedColors();
    pointronEvents.subscribe(async (x: PointronEvent) => {
      if (x.event === PointronEventEnum.GOALS_UPDATED) {
        usedColors = getUsedColors();
      }
    });
  });
  let usedColors: number[];
  let tagOptions: AutocompleteListItemType[] = $tagStore.tags;
</script>

<div class="flex flex-col w-full gap-6 pb-20">
  <TextInput
    bind:value={$newGoalStore.goal.label}
    placeholder="Enter goal name here"
    label={{ label: "Goal name", orientation: Orientation.Vertical }}
    width="w-full"
  />
  <TextArea
    placeholder="Type description of the goal here"
    bind:value={$newGoalStore.goal.description}
    label={{ label: "Description", orientation: Orientation.Vertical }}
    rows={3}
  />
  <ChipsAutocomplete
    label="Tags"
    bind:values={$newGoalStore.goal.tags}
    chipsVariant={ChipVariant.OUTLINED}
    placeholder={$newGoalStore.goal.tags?.length
      ? "type to add"
      : "start typing to add tags"}
    options={tagOptions}
  />
  <GoalColorPickerWithPreview
    bind:hue={$newGoalStore.goal.color}
    label={$newGoalStore.goal.label}
  />
  <SwitchInput
    label={{ label: "Pin goal to quick focus" }}
    width="w-full"
    bind:checked={$newGoalStore.goal.isPinnedForQuickStart}
  />
  <SwitchInput
    label={{ label: "Mark as favorite" }}
    width="w-full"
    bind:checked={$newGoalStore.goal.isFavorite}
  />
</div>

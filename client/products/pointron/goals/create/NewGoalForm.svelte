<script lang="ts">
  import ChipsAutocomplete from "$lib/client/elements/autocomplete/ChipsAutocomplete.svelte";
  import type { AutocompleteListItemType } from "$lib/client/types/autocompleteListItem.type";
  import { ChipVariant } from "$lib/client/types/chipVariant.enum";
  import GoalColorPickerWithPreview from "../GoalColorPickerWithPreview.svelte";
  import { onMount } from "svelte";
  import { newGoalStore } from "$lib/client/products/pointron/goals/goal.store";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { isValidString } from "$lib/client/utils/text.utils";
  function getUsedColors() {
    return [];
  }
  onMount(async () => {
    usedColors = getUsedColors();
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
      ? "type to select"
      : "start typing to select tags"}
    options={tagOptions}
  />
  <GoalColorPickerWithPreview
    bind:hue={$newGoalStore.goal.color}
    label={isValidString($newGoalStore.goal.label)
      ? $newGoalStore.goal.label
      : "Preview"}
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

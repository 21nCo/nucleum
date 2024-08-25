<script lang="ts">
  import ChipsAutocomplete from "$lib/client/elements/autocomplete/ChipsAutocomplete.svelte";
  import { ChipVariant } from "$lib/client/types/chipVariant.enum";
  import GoalColorPickerWithPreview from "../GoalColorPickerWithPreview.svelte";
  import { onMount } from "svelte";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { newGoal } from "./store";
  function getUsedColors() {
    return [];
  }
  onMount(async () => {
    usedColors = getUsedColors();
  });
  let usedColors: number[];
</script>

<div class="flex flex-col w-full gap-6 pb-20">
  <TextInput
    bind:value={$newGoal.label}
    placeholder="Enter goal name here"
    label={{ label: "Goal name", orientation: Orientation.Vertical }}
    width="w-full"
  />
  <TextArea
    placeholder="Type description of the goal here"
    bind:value={$newGoal.description}
    label={{ label: "Description", orientation: Orientation.Vertical }}
    rows={3}
  />
  <ChipsAutocomplete
    label="Tags"
    bind:values={$newGoal.tags}
    chipsVariant={ChipVariant.OUTLINED}
    placeholder={$newGoal.tags?.length
      ? "type to select"
      : "start typing to select tags"}
    options={$tagStore.items}
  />
  <GoalColorPickerWithPreview
    bind:hue={$newGoal.color}
    label={isValidString($newGoal.label) ? $newGoal.label : "Preview"}
  />
  <SwitchInput
    label={{ label: "Pin goal to quick focus" }}
    isExpanded={true}
    bind:checked={$newGoal.isPinnedForQuickStart}
  />
  <SwitchInput
    label={{ label: "Star goal" }}
    isExpanded={true}
    bind:checked={$newGoal.isStarred}
  />
</div>

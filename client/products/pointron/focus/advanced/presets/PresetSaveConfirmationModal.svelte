<script lang="ts">
  import {
    activeSession,
    focusItemsStore
  } from "$lib/client/products/pointron/focus/session.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import PresetItem from "./PresetItem.svelte";
  import PresetGoalsSelector from "./PresetGoalsSelector.svelte";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { onMount } from "svelte";
  import type { IFocusItem } from "$lib/client/types/pointron/session.type";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import ModalContentPadded from "$lib/client/components/modal/ModalContentPadded.svelte";
  let selectedGoals: IGoalThumb[] = [];
  let newPresetLabel = "";

  onMount(async () => {
    const currentFocusItems = $focusItemsStore.items;
    if (currentFocusItems?.length) {
      const focusItemIds = currentFocusItems.map((item) => item.id);
      const goals = await goalStore.selectMany(
        {
          filters: {
            id: focusItemIds
          }
        },
        {
          isExpand: true
        }
      );
      if (goals) {
        selectedGoals = goals;
      }
    }
  });

  async function savePreset() {
    return activeSession.saveCurrentCompositionAsPreset({
      goals: selectedGoals.map((g) => g.id),
      name: newPresetLabel
    });
  }
</script>

<ModalContentPadded class="flex flex-col gap-6">
  <div class="flex justify-center">
    <PresetItem
      preset={{
        ...$activeSession.composition,
        name: newPresetLabel,
        goals: selectedGoals.map((g) => g.id)
      }}
      isExpandedVariant={true}
    />
  </div>
  <TextInput
    bind:value={newPresetLabel}
    placeholder="Preset name or leave empty"
    label={{ label: "Preset name", orientation: Orientation.Vertical }}
  />
  <PresetGoalsSelector bind:selectedGoals />
</ModalContentPadded>
<div class="mt-auto">
  <ModalFooter
    action={PointronAction.SAVE_PRESET_MODAL}
    size={Size.sm}
    primaryAction={{
      label: "Save",
      callback: savePreset
    }}
    secondaryAction={{
      label: "Cancel"
    }}
  />
</div>

<script lang="ts">
  import {
    activeSession,
    focusItemsStore
  } from "@21n/products/pointron/focus/session.store";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import PresetItem from "@21n/products/pointron/focus/advanced/presets/PresetItem.svelte";
  import PresetGoalsSelector from "@21n/products/pointron/focus/advanced/presets/PresetGoalsSelector.svelte";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { goalStore } from "@21n/components/goals/goal.store";
  import { onMount } from "svelte";
  import type { IFocusItem } from "@21n/types/pointron/session.type";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { Size } from "@21n/types/size.enum";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";
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

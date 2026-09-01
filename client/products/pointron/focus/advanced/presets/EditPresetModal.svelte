<script lang="ts">
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import {
    SessionCompositionType,
    type SessionComposition,
    BreakCompositionType
  } from "@21n/types/pointron/sessionComposition.type";
  import ComposeDuration from "@21n/products/pointron/focus/advanced/composition/ComposeDuration.svelte";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { ButtonVariant } from "@21n/types/button.type";
  import { deepCopy } from "@21n/shared-utils/obj.utils";
  import { onMount } from "svelte";
  import ComposeTotalsText from "@21n/products/pointron/focus/advanced/composition/ComposeTotalsText.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import FullScreenCloseButton from "@21n/elements/button/FullScreenCloseButton.svelte";
  import { goalStore } from "@21n/components/goals/goal.store";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import PresetGoalsSelector from "@21n/products/pointron/focus/advanced/presets/PresetGoalsSelector.svelte";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";

  let { id = "" }: { id?: string } = $props();
  let composition: SessionComposition;
  let selectedGoals: IGoalThumb[] = [];

  let seedPreset: SessionComposition = {
    id: generateSimpleRandomId(),
    numberOfFocusRounds: 2,
    focusDuration: 28 * 60,
    breakDuration: 2 * 60,
    type: SessionCompositionType.POMODORO,
    totalDuration: 0,
    breakType: BreakCompositionType.PREDEFINED,
    numberOfBreaks: 1,
    breakReminder: $pointronPreferences.breakReminder,
    goals: []
  };

  onMount(async () => {
    if (id) {
      composition = deepCopy(
        $pointronPreferences.presets.find((x) => x.id === id)!
      );
      if (composition.goals?.length) {
        const goals = await goalStore.selectMany(
          {
            filters: {
              id: composition.goals
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
    } else {
      composition = deepCopy(seedPreset);
    }
  });

  async function saveHandler() {
    composition.goals = selectedGoals.map((g) => g.id);
    if (id) {
      pointronPreferences.updatePreset(composition);
    } else {
      pointronPreferences.addPreset(composition);
    }
    return true;
  }

  async function deleteHandler() {
    if (composition && composition.id)
      pointronPreferences.removePreset(composition.id);
    return true;
  }
</script>

<div class="flex flex-col gap-6 justify-between w-full h-full">
  {#if composition}
    <ModalContentPadded class="flex flex-col gap-4 flex-grow">
      <TextInput
        bind:value={composition.name}
        label={{ label: "Preset name", orientation: Orientation.Vertical }}
        placeholder="Give preset a name or leave it blank"
      />
      <ComposeTotalsText {composition} />
      <ComposeDuration
        bind:composition
        onChange={() => (composition = composition)}
      />
      <PresetGoalsSelector bind:selectedGoals />
    </ModalContentPadded>
    <ModalFooter
      action={PointronAction.EDIT_PRESET}
      primaryAction={{
        label: "Save",
        callback: saveHandler
      }}
      secondaryAction={{
        label: id ? "Delete" : "Discard",
        variant: id ? ButtonVariant.DANGER : ButtonVariant.SECONDARY,
        callback: id ? deleteHandler : undefined
      }}
    />
  {/if}
  <FullScreenCloseButton path={PointronAction.EDIT_PRESET} />
</div>

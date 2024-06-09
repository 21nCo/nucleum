<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import {
    SessionCompositionType,
    type SessionComposition,
    BreakCompositionType
  } from "$lib/client/types/pointron/sessionComposition.type";
  import ComposeDuration from "../composition/ComposeDuration.svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { deepCopy } from "$lib/client/utils/obj.utils";
  import { onMount } from "svelte";
  import ComposeTotalsText from "../composition/ComposeTotalsText.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let id: string;
  let composition: SessionComposition;

  let seedPreset: SessionComposition = {
    id: generateUID(),
    numberOfFocusRounds: 2,
    focusDuration: 28 * 60,
    breakDuration: 2 * 60,
    type: SessionCompositionType.POMODORO,
    totalDuration: 0,
    breakType: BreakCompositionType.PREDEFINED,
    numberOfBreaks: 1,
    breakReminder: $pointronPreferences.breakReminder
  };
  // $sessionStore.composition ?? {
  //   id: "",
  //   type:
  //     resolveUiState(
  //       $userLocalPreferences.uiStates,
  //       localUiStateEnum.advancedComposeType
  //     ) ?? SessionCompositionType.POMODORO,
  //   focusDuration:
  //     $sessionStore.plannedDuration === 0
  //       ? 28 * 60
  //       : $sessionStore.plannedDuration,
  //   breakDuration: 2 * 60,
  //   numberOfBreaks: 1,
  //   totalDuration: 0,
  //   numberOfFocusRounds: 3,
  // }

  onMount(() => {
    if (id) {
      composition = deepCopy(
        $pointronPreferences.presets.find((x) => x.id === id)!
      );
    } else {
      composition = deepCopy(seedPreset);
    }
  });
  $: console.log({ composition, savedPresets: $pointronPreferences.presets });
  async function close() {
    return modalEvent.hideSpecific(PointronEventEnum.EDIT_PRESET);
  }
  async function saveHandler() {
    if (id) {
      pointronPreferences.updatePreset(composition);
    } else {
      pointronPreferences.addPreset(composition);
    }
    return close();
  }
  function deleteHandler() {
    if (composition && composition.id)
      pointronPreferences.removePreset(composition.id);
    return close();
  }
</script>

<div class="flex flex-col justify-between w-full h-full">
  {#if composition}
    <div class="flex flex-col gap-4 flex-grow">
      <TextInput
        bind:value={composition.name}
        label={{ label: "Preset name", orientation: Orientation.Vertical }}
        placeholder="Give preset a name or leave it blank"
      />
      <ComposeTotalsText {composition} />
      <ComposeDuration bind:composition />
    </div>
    <ModalFooter
      primaryAction={{
        label: "Save",
        callback: saveHandler
      }}
      secondaryAction={{
        label: id ? "Delete" : "Discard",
        variant: id ? ButtonVariant.DANGER : ButtonVariant.SECONDARY,
        callback: id ? deleteHandler : close
      }}
    />
  {/if}
</div>

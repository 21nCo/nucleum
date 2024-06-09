<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  const dispatch = createEventDispatcher();
  export let composition: SessionComposition;
  export let isShowRemove: boolean = false;
  let error: string | null = null;
  // let rounds = composition.numberOfFocusRounds ?? 2;
  // let focus = composition.focusDuration ?? 28;
  // let brek = composition.breakDuration ?? 2;
  function onRemoveClicked() {
    dispatch("remove", { preset: composition });
  }
  // function onChange(event: any) {
  //   let presetToBeSaved = {
  //     ...composition,
  //     duration: +focus,
  //     brek: +brek,
  //     rounds: +rounds,
  //   };
  //   composition = presetToBeSaved;
  //   console.log({ event, focus, brek, rounds, preset: composition });
  //   dispatch("change", { preset: presetToBeSaved });
  // }
  $: if (
    composition?.numberOfFocusRounds &&
    composition.numberOfFocusRounds > 20
  )
    error = "Max allowed rounds is 20";
</script>

<div class="flex flex-col gap-8 p-6 rounded-md border-2 border-bgs2">
  {#if isShowRemove}
    <div class="self-end">
      <Button icon="cross" on:click={onRemoveClicked} />
    </div>
  {/if}
  <div class="flex flex-col gap-1">
    <FormControlLabel props={{ label: "Focus rounds & duration" }} />
    <div class="flex w-full gap-2 items-center">
      <div class="w-1/3">
        <TextInput
          bind:value={composition.numberOfFocusRounds}
          placeholder="rounds"
          type="number"
          numberInputParams={{ min: 1, max: 10, step: 1 }}
          on:change
        />
      </div>
      <div class="self-end flex gap-3 items-center">
        <div>x</div>
        <DurationInput bind:value={composition.focusDuration} on:change />
      </div>
    </div>
  </div>
  <DurationInput
    bind:value={composition.breakDuration}
    on:change
    label={{ label: "Break duration", orientation: Orientation.Vertical }}
  />
  <InlineErrorMessage bind:error />
</div>

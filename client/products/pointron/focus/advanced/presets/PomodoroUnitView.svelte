<script lang="ts">
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import type { SessionComposition } from "@21n/types/pointron/sessionComposition.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  const dispatch = createEventDispatcher();
  export let composition: SessionComposition;
  export let isShowRemove: boolean = false;
  let error: string | null = null;
  export let variant: "v1" | "v2" = "v2";
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
</script>

<div
  class="relative flex flex-col w-full gap-6 2k:gap-8 p-3 dp:p-4 2k:p-6 rounded-md border-2 border-bgs2 userdata"
>
  {#if isShowRemove}
    <!-- <div class="self-end">
      <Button icon="cross" on:click={onRemoveClicked} />
    </div> -->
    <div class="absolute bg-bgs1 right-1 -top-3">
      <Button
        icon="minus-circled"
        size={Size.xs}
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        label="Remove"
        on:click={onRemoveClicked}
      />
    </div>
  {/if}
  {#if variant === "v1"}
    <div class="flex flex-col gap-1">
      <FormControlLabel props={{ label: "Focus rounds & duration" }} />
      <div class="flex w-full gap-2 items-center">
        <div class="w-1/3">
          <TextInput
            bind:value={composition.numberOfFocusRounds}
            placeholder="rounds"
            type="number"
            numberInputParams={{ min: 1, max: 100, step: 1 }}
            on:change
          />
        </div>
        <div class="self-end flex gap-3 items-center">
          <div>x</div>
          <DurationInput bind:value={composition.focusDuration} on:change />
        </div>
      </div>
    </div>
  {:else}
    <TextInput
      bind:value={composition.numberOfFocusRounds}
      placeholder="rounds"
      type="number"
      numberInputParams={{ min: 1, max: 100, step: 1 }}
      label={{
        label: "Number of focus rounds",
        orientation: Orientation.Vertical
      }}
      on:change
    />
    <DurationInput
      bind:value={composition.focusDuration}
      on:change
      label={{ label: "Focus duration", orientation: Orientation.Vertical }}
    />
  {/if}

  <DurationInput
    bind:value={composition.breakDuration}
    on:change
    label={{ label: "Break duration", orientation: Orientation.Vertical }}
  />
  <!-- <InlineErrorMessage bind:error /> -->
</div>

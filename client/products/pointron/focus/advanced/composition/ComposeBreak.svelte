<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import {
    BreakCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let composition: SessionComposition;
  export let isDisablePredefined: boolean = false;
  const labelProps = { orientation: Orientation.Vertical };
  if (!composition.breakReminder || composition.breakReminder == 0)
    composition.breakReminder = $pointronPreferences.breakReminder;
  if (!composition.breakDuration || composition.breakDuration == 0)
    composition.breakDuration = 5 * 60;
  if (!composition.numberOfBreaks || composition.numberOfBreaks == 0)
    composition.numberOfBreaks = 2;
</script>

<div class="flex flex-col w-full gap-2 items-start">
  <!-- <div class="flex gap-2 items-center">
    <Text style={TextStyle.SECTION_HEADING} content="Break" />
  </div> -->
  <div class="flex flex-col w-full gap-6 items-center">
    <OptionSelector
      options={[
        { value: BreakCompositionType.REMINDER },
        {
          value: BreakCompositionType.PREDEFINED,
          isDisabled: isDisablePredefined
        }
      ]}
      labelProps={{
        ...labelProps,
        label: "Break type",
        tooltip: {
          body: `Choose **Reminder** to recieve a break notification every certain time, or **Predefined** to have a fixed number of breaks with a fixed duration.`
        }
      }}
      on:select={(e) => {
        console.log({ e });
        composition.breakType = e.detail;
        dispatch("change");
      }}
      style={OptionSelectorStyle.CHECK_CIRCLE}
      selected={composition.breakType}
    />
    {#if composition.breakType == BreakCompositionType.PREDEFINED}
      <TextInput
        bind:value={composition.numberOfBreaks}
        placeholder="No. of breaks"
        on:change
        label={{ ...labelProps, label: "No. of breaks" }}
        type="number"
      />
      <DurationInput
        bind:value={composition.breakDuration}
        on:change
        label={{ ...labelProps, label: "Break duration" }}
      />
    {:else}
      <DurationInput
        bind:value={composition.breakReminder}
        on:change
        label={{ ...labelProps, label: "Remind every" }}
      />
    {/if}
  </div>
</div>

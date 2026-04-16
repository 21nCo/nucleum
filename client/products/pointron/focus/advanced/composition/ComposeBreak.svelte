<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import {
    BreakCompositionType,
    type SessionComposition
  } from "@21n/types/pointron/sessionComposition.type";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  let {
    composition = $bindable(),
    isDisablePredefined = false,
    onChange = undefined
  }: {
    composition: SessionComposition;
    isDisablePredefined?: boolean;
    onChange?: ((event: CustomEvent<void>) => void) | undefined;
  } = $props();
  const labelProps = { orientation: Orientation.Vertical };
  if (!composition.breakReminder || composition.breakReminder == 0)
    composition.breakReminder = $pointronPreferences.breakReminder;
  if (!composition.breakDuration || composition.breakDuration == 0)
    composition.breakDuration = 5 * 60;
  if (!composition.numberOfBreaks || composition.numberOfBreaks == 0)
    composition.numberOfBreaks = 2;

  function emitChange() {
    const changeEvent = new CustomEvent<void>("change");
    onChange?.(changeEvent);
  }
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
      onSelect={(e) => {
        console.log({ e });
        composition.breakType = e.detail;
        emitChange();
      }}
      style={OptionSelectorStyle.CHECK_CIRCLE}
      selected={composition.breakType}
    />
    {#if composition.breakType == BreakCompositionType.PREDEFINED}
        <TextInput
          bind:value={composition.numberOfBreaks}
          placeholder="No. of breaks"
          onChange={emitChange}
          label={{ ...labelProps, label: "No. of breaks" }}
          type="number"
        />
      <DurationInput
        bind:value={composition.breakDuration}
        onChange={emitChange}
        label={{ ...labelProps, label: "Break duration" }}
      />
    {:else}
      <DurationInput
        bind:value={composition.breakReminder}
        onChange={emitChange}
        label={{ ...labelProps, label: "Remind every" }}
      />
    {/if}
  </div>
</div>

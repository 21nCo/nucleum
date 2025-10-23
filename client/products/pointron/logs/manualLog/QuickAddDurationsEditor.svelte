<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabelWrapper from "@21n/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonVariant, ButtonStyle } from "@21n/types/button.type";
  import { bg, cn } from "@21n/utils/ui.utils";
  import type { InputLabel } from "@21n/types/input.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { rearrangeOnAxis } from "@21n/actions/rearrange.action";
  import { moveItemInArray } from "@21n/shared-utils/obj.utils";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { TimeFormat } from "@21n/types/time.type";
  import { Size } from "@21n/types/size.enum";

  export let values: number[] | undefined = undefined;
  export let label: InputLabel = {
    label: "Manual logs - Quick durations",
    tooltip: {
      body: "Quick duration options for manual time entries. Use these to quickly add durations to your manual logs."
    },
    orientation: Orientation.Vertical
  };
  export let placeholder: string | undefined = undefined;
  let parentBgIndex: number = 1;

  const dispatch = createEventDispatcher();
  let currentValue: number = 0;

  $: if (values === undefined) {
    values = [];
  }

  /**
   * Add a new value to the list
   * Convert the value to minutes before adding
   */
  function addValue() {
    if (currentValue > 0 && values) {
      const newValues = [...values, currentValue / 60];
      values = newValues;
      currentValue = 0;
      dispatch("change", { values: newValues });
    }
  }

  function removeValue(index: number) {
    if (values) {
      const newValues = values.filter((_, i) => i !== index);
      values = newValues;
      dispatch("change", { values: newValues });
    }
  }

  function handleRearrange(index: number, displacement: number) {
    values = moveItemInArray(values, index, displacement > 0 ? 1 : -1);
  }

  function handleRearranged() {
    dispatch("change", { values: values });
  }
</script>

<div class="p-3 border border-brs3 rounded-md">
  <FormControlLabelWrapper props={label}>
    <div class="flex flex-col gap-4 w-full">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <DurationInput
            bind:value={currentValue}
            {placeholder}
            isExpanded={true}
          />
        </div>
        <Button
          label="Add"
          icon="plus"
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.DEFAULT}
          on:click={addValue}
        />
      </div>
      <div class="flex flex-wrap gap-2">
        {#each values || [] as value, index (value)}
          <div
            class={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md",
              bg(parentBgIndex)
            )}
            use:rearrangeOnAxis={{
              enabled: true,
              onRearrange: (displacement) => {
                handleRearrange(index, displacement);
              },
              onRearranged: handleRearranged,
              threshold: 20
            }}
          >
            <span class="text-fgs2"
              >{formatSeconds(value * 60, TimeFormat.VERBOSE, {
                verboseTextSize: Size.md
              })}</span
            >
            <Button
              on:click={() => removeValue(index)}
              icon="cross"
              parentBgIndex={parentBgIndex + 1}
            />
          </div>
        {/each}
      </div>
    </div>
  </FormControlLabelWrapper>
</div>

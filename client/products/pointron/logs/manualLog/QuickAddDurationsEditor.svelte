<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabelWrapper from "../../../../elements/text/formLabel/FormControlLabelWrapper.svelte";
  import DurationInput from "../../../../elements/input/durationInput/DurationInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant, ButtonStyle } from "$lib/client/types/button.type";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import type { InputLabel } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { rearrangeOnAxis } from "$lib/client/actions/rearrange.action";
  import { moveItemInArray } from "$lib/shared/utils/obj.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { Size } from "$lib/client/types/size.enum";

  export let values: number[] | undefined = undefined;
  export let label: InputLabel = {
    label: "Quick duration options",
    tooltip: {
      body: "Quick duration options for manual time entries (in minutes). Add multiple values to create quick selection options."
    },
    orientation: Orientation.Vertical
  };
  export let placeholder: string | undefined = undefined;
  let parentBgIndex: number = 2;

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

<div class="bg-bgs2 p-3 rounded-md">
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
          icon="ph:plus-light"
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
              icon="ph:x"
              parentBgIndex={parentBgIndex + 1}
            />
          </div>
        {/each}
      </div>
    </div>
  </FormControlLabelWrapper>
</div>

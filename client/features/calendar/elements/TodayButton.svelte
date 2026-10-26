<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { selectedTimePeriod } from "@nucleum/shared-state/app-context/app.store";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { isSameDay } from "@21n/shared-utils/datetime/date-arithmetic";

  let {
    parentBackgroundIndex = 1,
    onclick = undefined
  }: {
    parentBackgroundIndex?: number;
    onclick?: MouseEventHandler<HTMLButtonElement> | undefined;
  } = $props();

</script>

{#if !isSameDay($selectedTimePeriod, new Date())}
  <Button
    label="Go to today"
    parentBgIndex={parentBackgroundIndex}
    size={Size.xs}
    style={ButtonStyle.OUTLINED}
    onclick={(event) => {
      selectedTimePeriod.set(new Date());
      onclick?.(event);
    }}
  />
{/if}

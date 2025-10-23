<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { selectedTimePeriod } from "@21n/stores/app.store";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { isSameDay } from "@21n/utils/time.utils";
  export let parentBackgroundIndex: number = 1;
</script>

{#if !isSameDay($selectedTimePeriod, new Date())}
  <Button
    label="Go to today"
    parentBgIndex={parentBackgroundIndex}
    size={Size.xs}
    style={ButtonStyle.OUTLINED}
    on:click={() => {
      selectedTimePeriod.set(new Date());
    }}
  />
{/if}

<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { isSameDay, formatDate } from "$lib/tidy/utils/time.utils";
  export let parentBackgroundIndex: number = 0;
</script>

{#if !isSameDay($selectedTimePeriod, new Date())}
  <Button
    label="Go to today"
    {parentBackgroundIndex}
    size={Size.xs}
    on:click={() => {
      selectedTimePeriod.set(new Date());
    }}
  />
{/if}

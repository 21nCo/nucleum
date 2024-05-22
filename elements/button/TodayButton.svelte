<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { selectedTimePeriod } from "$lib/tidy/stores/app.store";
  import { ButtonStyle } from "$lib/tidy/types/button.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { isSameDay } from "$lib/tidy/utils/time.utils";
  export let parentBackgroundIndex: number = 1;
</script>

{#if !isSameDay($selectedTimePeriod, new Date())}
  <Button
    label="Go to today"
    {parentBackgroundIndex}
    size={Size.xs}
    style={ButtonStyle.OUTLINED}
    on:click={() => {
      selectedTimePeriod.set(new Date());
    }}
  />
{/if}

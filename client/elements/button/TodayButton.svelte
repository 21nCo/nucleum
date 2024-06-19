<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { isSameDay } from "$lib/client/utils/time.utils";
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

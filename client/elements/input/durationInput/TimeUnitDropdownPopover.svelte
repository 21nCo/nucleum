<script lang="ts">
  import type { TimeUnit } from "@21n/types/time.type";
  import TimeUnitItem from "@21n/elements/input/durationInput/TimeUnitItem.svelte";
  export let units: TimeUnit[];
  export let currentTimeUnit: TimeUnit;
  export let selectedIndex: number;
  export let handleTimeUnitItemClick: (unit: TimeUnit) => void;
</script>

<div class="bg-bgs1 w-40 rounded-md flex flex-col">
  {#if units.length > 1}
    {#each units as unit, index}
      <TimeUnitItem
        isActive={currentTimeUnit === unit || selectedIndex === index}
        {unit}
        on:click={() => handleTimeUnitItemClick(unit)}
      />
    {/each}
  {/if}
</div>

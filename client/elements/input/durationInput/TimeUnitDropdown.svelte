<script lang="ts">
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import type { TimeUnit } from "$lib/client/types/time.type";
  import { borderClass } from "$lib/client/utils/theme.utils";
  import TimeUnitItem from "./TimeUnitItem.svelte";
  import { createEventDispatcher } from "svelte";
  import appearance from "$lib/client/stores/appearance.store";

  export let units: TimeUnit[];
  export let currentTimeUnit: TimeUnit;

  let isUnitDropdownOpen: boolean;
  let selectedIndex: number = -1; // -1 means no item is selected
  let unitClasses: string =
    "border rounded-r-md py-2 px-4 min-w-[90px] cursor-pointer flex justify-center relative select-none " +
    borderClass($appearance, ColorStrength.Strong);
  const containerId = "units-dropdown-container";

  const dispatch = createEventDispatcher();

  function closeUnitDropdown() {
    isUnitDropdownOpen = false;
    selectedIndex = -1;
  }
  function handleTimeUnitItemClick(event: CustomEvent<TimeUnit>) {
    const item = event.detail;
    timeUnitSelection(item);
  }
  function timeUnitSelection(item: TimeUnit) {
    if (currentTimeUnit !== item) {
      dispatch("change", {
        unit: {
          new: item,
          old: currentTimeUnit
        }
      });
      currentTimeUnit = item;
    }
    closeUnitDropdown();
  }
  function handleIsUnitDropDownOpen() {
    isUnitDropdownOpen = !isUnitDropdownOpen;
    if (isUnitDropdownOpen) selectedIndex = units.indexOf(currentTimeUnit);
  }
  function handleKeyDownInDropdown(event: KeyboardEvent) {
    if (!isUnitDropdownOpen) return;
    if (event.key === "Enter") {
      timeUnitSelection(units[selectedIndex]);
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, units.length - 1);
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (event.key === "Escape") {
      closeUnitDropdown();
    }
  }
  //TODO - clicking outside scenario for unit dropdown
</script>

<button
  id={containerId}
  tabindex="0"
  on:click={handleIsUnitDropDownOpen}
  on:keydown={handleKeyDownInDropdown}
  class={unitClasses}
>
  <div class="current-unit flex items-center gap-1">
    <span class="flex justify-center items-center h-6">{currentTimeUnit}</span>
    <div
      class={`drop-down-indicator transition-all duration-300 ease-out w-[0.5rem] h-[0.375rem] bg-fgs2 ${
        isUnitDropdownOpen ? `rotate-180` : `rotate-0`
      }`}
    />
  </div>
  <div
    class="units-dropdown absolute bg-bgs2 top-[calc(100%+2px)] -right-[2px] w-full rounded-sm flex flex-col gap-1 z-[200]"
  >
    {#if units.length > 1 && isUnitDropdownOpen}
      {#each units as unit, index}
        <TimeUnitItem
          isActive={currentTimeUnit === unit || selectedIndex === index}
          {unit}
          on:click={handleTimeUnitItemClick}
        />
      {/each}
    {/if}
  </div>
</button>

<style>
  .drop-down-indicator {
    clip-path: polygon(50% 100%, 0% 0, 100% 0);
  }
</style>

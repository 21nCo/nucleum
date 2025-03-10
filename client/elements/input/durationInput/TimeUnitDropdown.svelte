<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import type { TimeUnit } from "$lib/client/types/time.type";
  import TimeUnitDropdownPopover from "./TimeUnitDropdownPopover.svelte";
  import { createEventDispatcher } from "svelte";

  export let units: TimeUnit[];
  export let currentTimeUnit: TimeUnit;

  let isUnitDropdownOpen: boolean;
  let selectedIndex: number = -1; // -1 means no item is selected
  let unitClasses: string =
    "border rounded-r-md py-2 px-4 min-w-[90px] cursor-pointer flex justify-center relative select-none border-brs3";
  const containerId = "units-dropdown-container";
  let popoverRef: HTMLElement;

  const dispatch = createEventDispatcher();

  function closeUnitDropdown() {
    isUnitDropdownOpen = false;
    selectedIndex = -1;
    popoverRef?.dispatchEvent(new CustomEvent("hide"));
  }

  function handleTimeUnitItemClick(unit: TimeUnit) {
    timeUnitSelection(unit);
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
  bind:this={popoverRef}
  use:popover={{
    content: TimeUnitDropdownPopover,
    componentProps: {
      units,
      currentTimeUnit,
      isUnitDropdownOpen,
      selectedIndex,
      handleTimeUnitItemClick
    }
  }}
  on:change={(e) => {
    isUnitDropdownOpen = e.detail?.open;
    if (isUnitDropdownOpen) selectedIndex = units.indexOf(currentTimeUnit);
  }}
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
</button>

<style>
  .drop-down-indicator {
    clip-path: polygon(50% 100%, 0% 0, 100% 0);
  }
</style>

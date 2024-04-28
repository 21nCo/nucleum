<script lang="ts">
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import type { TimeUnit } from "$lib/tidy/types/time.type";
  import { borderClass } from "$lib/tidy/utils/theme.utils";
  import { actIfClickedOutside } from "$lib/tidy/utils/utils";
  import TimeUnitItem from "./TimeUnitItem.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { appEvents } from "$lib/tidy/stores/notification.store";

  export let units: TimeUnit[];
  export let currentTimeUnit: TimeUnit;

  let isUnitDropdownOpen: boolean;
  let selectedIndex: number = -1; // -1 means no item is selected
  let unitClasses: string =
    "border-2 rounded-sm py-2 px-4 rounded-l-none min-w-[90px] cursor-pointer flex justify-center relative select-none " +
    borderClass($appearance);
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

<!-- In the below div we are getting a warning A11y: noninteractive element cannot have nonnegative tabIndex value svelte(a11y-no-noninteractive-tabindex), to fix this, later we'll attach a select field to this and use that just for its interactivity but for functionality and UI we'll use the below code-->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
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

  <!-- In the below div, we added 2px along with 100% to overcome 2px outline, which is not included in the dimension of the element, similar reason for addition of 2px in right value-->
  <div
    class="units-dropdown absolute bg-bgs2 top-[calc(100%+2px)] -right-[2px] w-full rounded-sm flex flex-col gap-1 z-[40000]"
  >
    <!-- the function under on:keydown listener is not working as expected right, need to fix that (when navigated to a specific unit through a tab and hit enter then we want to update the unit to that) -->
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
</div>

<style>
  .drop-down-indicator {
    clip-path: polygon(50% 100%, 0% 0, 100% 0);
  }
</style>

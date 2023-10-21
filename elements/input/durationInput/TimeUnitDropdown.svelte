<script lang="ts">
  import { pointronEvents } from "$lib/local/stores/local.store";
  import { PointronEventEnum } from "$lib/local/types/pointronEvent.enum";
  import type { PointronEvent } from "$lib/local/types/pointronEvent.type";
  import { actIfClickedOutside } from "$lib/local/utils/local.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  import type { TimeUnit } from "$lib/tidy/types/time.type";
  import { borderColor } from "$lib/tidy/utils/utils";
  import TimeUnitItem from "./TimeUnitItem.svelte";
  import { createEventDispatcher } from "svelte";

  export let units: TimeUnit[];
  export let currentTimeUnit: TimeUnit;

  let isUnitDropdownOpen: boolean;
  let selectedIndex: number = -1; // -1 means no item is selected
  let unitClasses: string =
    "border rounded-sm text-[1.125rem] text-[0.875rem] leading-8 p-2 px-4 rounded-l-none min-w-[90px] cursor-pointer flex justify-center relative select-none" +
    borderColor($userPreferences.theme, ColorStrength.Strong);
  const containerId = "units-dropdown-container";

  const dispatch = createEventDispatcher();

  function closeUnitDropdown() {
    isUnitDropdownOpen = false;
    selectedIndex = -1;
  }
  function handleTimeUnitItemClick(item: TimeUnit) {
    return () => {
      if (currentTimeUnit !== item) {
        dispatch("unit-changed", {
          unit: {
            new: item,
            old: currentTimeUnit,
          },
        });
        currentTimeUnit = item;
      }
      closeUnitDropdown();
    };
  }
  function handleIsUnitDropDownOpen(isOpen: boolean) {
    return () => {
      isUnitDropdownOpen = isOpen;
      if (isOpen) selectedIndex = units.indexOf(currentTimeUnit);
    };
  }
  function handleKeyDownInDropdown(event: KeyboardEvent) {
    if (!isUnitDropdownOpen) return;
    if (event.key === "Enter") {
      handleTimeUnitItemClick(units[selectedIndex])();
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, units.length - 1);
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (event.key === "Escape") {
      closeUnitDropdown();
    }
  }

  pointronEvents.subscribe((x: PointronEvent) => {
    if (
      x.event === PointronEventEnum.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `#${containerId}`, closeUnitDropdown);
    }
  });
</script>

<!-- In the below div we are getting a warning A11y: noninteractive element cannot have nonnegative tabIndex value svelte(a11y-no-noninteractive-tabindex), to fix this, later we'll attach a select field to this and use that just for its interactivity but for functionality and UI we'll use the below code-->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  id={containerId}
  tabindex="0"
  on:click={handleIsUnitDropDownOpen(!isUnitDropdownOpen)}
  on:keydown={handleKeyDownInDropdown}
  class={unitClasses}
>
  <div class="current-unit flex items-center gap-1">
    <span>{currentTimeUnit}</span>
    <div
      class={`drop-down-indicator transition-all duration-300 ease-out w-[0.5rem] h-[0.375rem] bg-fgs1 ${
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
          on:click={handleTimeUnitItemClick(unit)}
          on:keydown={() => handleTimeUnitItemClick(unit)}>{unit}</TimeUnitItem
        >
      {/each}
    {/if}
  </div>
</div>

<style>
  .drop-down-indicator {
    clip-path: polygon(50% 100%, 0% 0, 100% 0);
  }
</style>

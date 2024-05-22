<script lang="ts">
  import { onMount } from "svelte";
  import TimeSelector from "../../TimeSelector.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import DropDown from "$lib/tidy/elements/dropdown/DropDown.svelte";
  import MultiselectDropdown from "$lib/tidy/elements/dropdown/MultiselectDropdown.svelte";
  import type { DropdownItem } from "$lib/tidy/types/dropdownItem.type";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/tidy/types/button.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { TimeScale } from "$lib/tidy/types/time.type";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { getTimeZonesWithOffsets } from "$lib/tidy/utils/time.utils";
  import { InputStyle } from "$lib/tidy/types/input.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  let timeZones: (Omit<DropdownItem, "value"> & { value: number })[];
  let timescaleOptions = Object.keys(TimeScale).map((key) => {
    return {
      label: properCase(key),
      value: TimeScale[key]
    };
  });
  onMount(() => {
    const rawZones = getTimeZonesWithOffsets();
    timeZones = rawZones.map((zone) => {
      return {
        label: zone.label,
        value: zone.offset
      };
    });
    let selectedTimezone;
    if ($userPreferences.timeZoneOffset) {
      selectedTimezone = timeZones.find(
        (zone) => zone.value === $userPreferences.timeZoneOffset
      )?.value;
    }
    if (selectedTimezone === undefined) {
      userPreferences.setTimeZone();
    }
  });
</script>

<div class="flex flex-col max-w-lg w-full gap-4">
  <MultiselectDropdown
    label={{
      label: "Time scales",
      tooltip: {
        body: "Only selected time scales will be used throughout the application eg: Analytics, targets etc"
      }
    }}
    options={timescaleOptions}
    bind:selected={$userPreferences.timeScales}
    style={InputStyle.BORDERED}
  />
  {#if timeZones && timeZones.length > 0}
    <div>
      <DropDown
        label={{
          label: "Timezone",
          orientation: Orientation.Horizontal,
          tooltip: {
            body: "The timezone used to calculate your daily target and streak."
          }
        }}
        style={InputStyle.BORDERED}
        items={timeZones}
        on:select={(e) => {
          userPreferences.setTimeZone(e.detail.value * 60);
        }}
        value={$userPreferences.timeZoneOffset}
      />
    </div>
    <Button
      label="Auto detect time zone"
      icon="sync"
      style={ButtonStyle.PLAIN}
      size={Size.sm}
      on:click={() => userPreferences.setTimeZone()}
    />
  {/if}
  <TimeSelector
    label="Day starts at"
    info="The time at which your day starts. This is used to calculate your daily target and streak."
    bind:hour={$userPreferences.dayStartHour}
    bind:minute={$userPreferences.dayStartMinute}
  />
</div>

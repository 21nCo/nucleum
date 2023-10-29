<script lang="ts">
  import { onMount } from "svelte";
  import TimeSelector from "../../TimeSelector.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import DropDown from "$lib/tidy/elements/dropdown/DropDown.svelte";
  import MultiselectDropdown from "$lib/tidy/elements/dropdown/MultiselectDropdown.svelte";
  import {
    DropDownStyle,
    type DropdownItem,
  } from "$lib/tidy/types/dropdownItem.type";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { ButtonStyle } from "$lib/tidy/types/button.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { TimeScale } from "$lib/tidy/types/time.type";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { getTimeZonesWithOffsets } from "$lib/tidy/utils/time.utils";

  export let selectedHour: any = "00";
  export let selectedMinute = "00";
  let timeZones: DropdownItem[] = [];
  let timeZoneSelectedIndex: number = -1;
  let timescaleOptions = Object.keys(TimeScale).map((key) => {
    return {
      label: properCase(key),
      value: TimeScale[key],
    };
  });
  onMount(() => {
    const rawZones = getTimeZonesWithOffsets();
    timeZones = rawZones.map((zone) => {
      return {
        label: zone.name + " (UTC" + zone.offset + ")",
        value: zone.name,
      };
    });
    if ($userPreferences.timeZone) {
      timeZoneSelectedIndex = timeZones.findIndex(
        (zone) => zone.value === $userPreferences.timeZone
      );
    }
    if (timeZoneSelectedIndex === -1) {
      autoDetectTimeZone();
    }

    if ($userPreferences.dayStart) {
      let parts = $userPreferences.dayStart?.split(":");
      selectedHour = parts[0];
      selectedMinute = parts[1];
    }
  });

  function autoDetectTimeZone() {
    try {
      timeZoneSelectedIndex = timeZones.findIndex(
        (zone) =>
          zone.value === Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      userPreferences.updateTimeZone(
        timeZones[timeZoneSelectedIndex].value as string
      );
    } catch (error) {
      console.error("Could not detect time zone:", error);
    }
  }

  function onChange(event: any) {
    userPreferences.updateDayStart(event.detail.value);
  }
</script>

<div class="flex flex-col max-w-lg gap-4">
  <MultiselectDropdown
    label="Time scales"
    info="Only selected time scales will be used throughout the application eg: Analytics, targets etc"
    options={timescaleOptions}
    bind:selected={$userPreferences.timeScales}
    style={DropDownStyle.OUTLINED}
  />
  {#if timeZones && timeZones.length > 0}
    <DropDown
      label="Timezone"
      style={DropDownStyle.OUTLINED}
      info="The timezone used to calculate your daily target and streak."
      items={timeZones}
      bind:selectedIndex={timeZoneSelectedIndex}
      on:select={(event) => {
        userPreferences.updateTimeZone(event.detail);
      }}
    />
    <Button
      label="Auto detect time zone"
      icon="sync"
      style={ButtonStyle.PLAIN}
      size={Size.sm}
      on:click={autoDetectTimeZone}
    />
  {/if}
  <TimeSelector
    label="Day starts at"
    info="The time at which your day starts. This is used to calculate your daily target and streak."
    {selectedHour}
    {selectedMinute}
    on:change={onChange}
  />
</div>

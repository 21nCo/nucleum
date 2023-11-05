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
  import {
    detectTimeZone,
    getTimeZonesWithOffsets,
  } from "$lib/tidy/utils/time.utils";
  let timeZones: (Omit<DropdownItem, "value"> & { value: string })[];
  let selectedTimezone: string | undefined = undefined;
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
      selectedTimezone = timeZones.find(
        (zone) => zone.value === $userPreferences.timeZone
      )?.value;
    }
    if (selectedTimezone === undefined) {
      $userPreferences.timeZone = detectTimeZone();
    }
  });
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
      bind:value={$userPreferences.timeZone}
    />
    <Button
      label="Auto detect time zone"
      icon="sync"
      style={ButtonStyle.PLAIN}
      size={Size.sm}
      on:click={() => {
        $userPreferences.timeZone = detectTimeZone();
      }}
    />
  {/if}
  <TimeSelector
    label="Day starts at"
    info="The time at which your day starts. This is used to calculate your daily target and streak."
    bind:value={$userPreferences.dayStart}
  />
</div>

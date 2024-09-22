<script lang="ts">
  import { onMount } from "svelte";
  import TimeSelector from "../../TimeSelector.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import MultiselectDropdown from "$lib/client/elements/dropdown/MultiselectDropdown.svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { getTimeZonesWithOffsets } from "$lib/client/utils/time.utils";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  let timeZones: { label: string; offset: number }[] = [];
  let timeZoneDropdownItems: (Omit<DropdownItem, "value"> & {
    value: string;
  })[];
  let selectedTimezone: string;
  let labelProps = { orientation: Orientation.Vertical };
  let timescaleOptions = Object.keys(TimeScale).map((key) => {
    return {
      label: properCase(key),
      value: TimeScale[key]
    };
  });
  onMount(() => {
    timeZones = getTimeZonesWithOffsets();
    if ($userPreferences.timeZoneOffset) {
      const savedSetting = timeZones.find(
        (zone) => zone.offset * 60 === $userPreferences.timeZoneOffset
      )?.label;
      if (savedSetting === undefined) {
        const { offset, label } = userPreferences.setTimeZone();
        selectedTimezone = label!;
      } else {
        selectedTimezone = savedSetting;
      }
    }
    timeZoneDropdownItems = timeZones.map((zone) => {
      return {
        label: zone.label,
        value: zone.label
      };
    });
  });
</script>

<div class="flex flex-col max-w-lg w-full gap-4">
  <MultiselectDropdown
    label={{
      ...labelProps,
      label: "Time scales",
      tooltip: {
        body: "Only selected time scales will be used throughout the application eg: Analytics, targets etc"
      }
    }}
    options={timescaleOptions}
    bind:selected={$userPreferences.timeScales}
    style={InputStyle.BORDERED}
  />
  {#if timeZoneDropdownItems && timeZoneDropdownItems.length > 0}
    <div>
      <DropDown
        label={{
          ...labelProps,
          label: "Timezone",
          tooltip: {
            body: "The timezone used to calculate your daily target and streak."
          }
        }}
        style={InputStyle.BORDERED}
        items={timeZoneDropdownItems}
        on:select={(e) => {
          const zone = timeZones.find((z) => z.label === e.detail);
          if (zone) userPreferences.setTimeZone(zone.offset * 60, zone.label);
        }}
        bind:value={selectedTimezone}
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

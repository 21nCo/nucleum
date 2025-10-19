<script lang="ts">
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import Birdview from "@21n/components/calendar/birdView/Birdview.svelte";
  import { CalendarLayout } from "@21n/components/calendar/calendar.type";
  import CalendarLayoutView from "@21n/components/calendar/CalendarLayout.svelte";
  import CalendarHeader from "@21n/components/calendar/classic/CalendarHeader.svelte";

  export let panel: CalendarLayout = CalendarLayout.Bird;
  let scale: TimeScaleUnit = TimeScaleUnit.DAY;
  let selectedDate: Date = new Date();

  const switchOptions = [
    {
      label: "Parts",
      icon: "text:P",
      value: TimeScaleUnit.PART
    },
    {
      label: "Days",
      icon: "text:D",
      value: TimeScaleUnit.DAY
    },
    {
      label: "Weeks",
      icon: "text:W",
      value: TimeScaleUnit.WEEK
    },
    {
      label: "Months",
      icon: "text:M",
      value: TimeScaleUnit.MONTH
    },
    {
      label: "Years",
      icon: "text:Y",
      value: TimeScaleUnit.YEAR
    }
  ];
</script>

<CalendarLayoutView bind:panel>
  <slot name="header-left-options" slot="header-left-options">
    <OptionSelector
      options={switchOptions}
      size={Size.sm}
      bind:selected={scale}
      parentBgIndex={2}
      isExpandOnActiveForIcon={true}
      style={OptionSelectorStyle.ICON}
    />
  </slot>
  <slot name="header" slot="header">
    <CalendarHeader
      bind:selectedDate
      bind:selectedView={scale}
      on:dateChange
      on:goToPrevious={() => {}}
      on:goToNext={() => {}}
    />
  </slot>
  <div class="w-full h-full max-h-full">
    <Birdview mode={scale} />
  </div>
</CalendarLayoutView>

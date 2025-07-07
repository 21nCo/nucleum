<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import Birdview from "../birdView/Birdview.svelte";
  import { CalendarLayout } from "../calendar.type";
  import CalendarLayoutView from "../CalendarLayout.svelte";
  import CalendarHeader from "../classic/CalendarHeader.svelte";

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

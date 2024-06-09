<script lang="ts">
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import type { DropdownGroup } from "$lib/client/types/dropdownItem.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { AnalyticsCardType } from "../analytics.types";
  export let selected: AnalyticsCardType;
  let chartTypes = [
    {
      label: "Pie chart",
      value: AnalyticsCardType.PIE,
      icon: "chart",
      groupId: "charts"
    },
    {
      label: "Donut chart",
      value: AnalyticsCardType.DONUT,
      icon: "chart",
      groupId: "charts"
    },
    {
      label: "Line chart",
      value: AnalyticsCardType.LINE,
      icon: "linechart",
      groupId: "charts"
    },
    {
      label: "Bar chart",
      value: AnalyticsCardType.BAR,
      icon: "barchart",
      groupId: "charts"
    },
    {
      label: "Area chart",
      value: AnalyticsCardType.AREA,
      icon: "areachart",
      groupId: "charts"
    },
    {
      label: "Targets",
      value: AnalyticsCardType.TARGETS,
      icon: "rocket",
      groupId: "other"
    },
    {
      label: "Top goals",
      value: AnalyticsCardType.TOP_N,
      icon: "rectangle-stack",
      groupId: "other"
    },
    {
      label: "Metrics",
      value: AnalyticsCardType.METRICS,
      icon: "adjustments-vertical",
      groupId: "other"
    }
  ];
  let groups: DropdownGroup[] = [
    {
      id: "charts",
      label: "Charts",
      order: 0
    },
    {
      id: "trends",
      label: "Trends",
      order: 1
    },
    {
      id: "other",
      label: "Other",
      order: 2
    }
  ];
</script>

<DropDown
  parentBackgroundIndex={1}
  on:select
  bind:value={selected}
  items={chartTypes}
  {groups}
  style={InputStyle.BORDERED}
  isDisableSearch={true}
/>

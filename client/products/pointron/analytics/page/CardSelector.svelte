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
      icon: "ph:chart-pie-light",
      groupId: "charts"
    },
    {
      label: "Donut chart",
      value: AnalyticsCardType.DONUT,
      icon: "ph:chart-donut-light",
      groupId: "charts"
    },
    {
      label: "Line chart",
      value: AnalyticsCardType.LINE,
      icon: "ph:chart-line-light",
      groupId: "charts"
    },
    {
      label: "Bar chart",
      value: AnalyticsCardType.BAR,
      icon: "ph:chart-bar-light",
      groupId: "charts"
    },
    {
      label: "Area chart",
      value: AnalyticsCardType.AREA,
      icon: "areachart",
      groupId: "charts"
    },
    {
      label: "Top goals",
      value: AnalyticsCardType.TOP_N,
      icon: "ph:rocket-light",
      groupId: "other"
    },
    {
      label: "Metrics",
      value: AnalyticsCardType.METRICS,
      icon: "ph:squares-four-light",
      groupId: "other"
    },
    {
      label: "Targets",
      value: AnalyticsCardType.TARGETS,
      icon: "ph:target-light",
      groupId: "other",
      badge: "planned",
      isDisabled: true
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

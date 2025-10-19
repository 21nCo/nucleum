<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import type { DropdownGroup } from "@21n/types/dropdownItem.type";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { AnalyticsCardType } from "@21n/products/pointron/analytics/analytics.types";
  export let accessPoint: ResourceAccessPoint;
  export let selected: AnalyticsCardType;
  let chartTypes = [
    {
      label: "Pie chart",
      value: AnalyticsCardType.PIE,
      icon: resolveChartIcon(AnalyticsCardType.PIE),
      groupId: "charts"
    },
    {
      label: "Donut chart",
      value: AnalyticsCardType.DONUT,
      icon: resolveChartIcon(AnalyticsCardType.DONUT),
      groupId: "charts"
    },
    {
      label: "Line chart",
      value: AnalyticsCardType.LINE,
      icon: resolveChartIcon(AnalyticsCardType.LINE),
      groupId: "charts"
    },
    {
      label: "Bar chart",
      value: AnalyticsCardType.BAR,
      icon: resolveChartIcon(AnalyticsCardType.BAR),
      groupId: "charts"
    },
    {
      label: "Area chart",
      value: AnalyticsCardType.AREA,
      icon: resolveChartIcon(AnalyticsCardType.AREA),
      groupId: "charts"
    },
    {
      label: "Top goals",
      value: AnalyticsCardType.TOP_N,
      icon: resolveChartIcon(AnalyticsCardType.TOP_N),
      groupId: "other"
    },
    {
      label: "Metrics",
      value: AnalyticsCardType.METRICS,
      icon: resolveChartIcon(AnalyticsCardType.METRICS),
      groupId: "other"
    },
    {
      label: "Targets",
      value: AnalyticsCardType.TARGETS,
      icon: resolveChartIcon(AnalyticsCardType.TARGETS),
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
    }
  ];
  if (accessPoint !== ResourceAccessPoint.GOAL) {
    groups.push(
      ...[
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
      ]
    );
  }

  function resolveChartIcon(chartType: AnalyticsCardType) {
    switch (chartType) {
      case AnalyticsCardType.PIE:
        return "chart";
      case AnalyticsCardType.DONUT:
        return "ph:chart-donut-light";
      case AnalyticsCardType.LINE:
        return "chart-line";
      case AnalyticsCardType.BAR:
        return "chart-bar";
      case AnalyticsCardType.AREA:
        return "areachart";
      case AnalyticsCardType.TOP_N:
        return "rocket";
      case AnalyticsCardType.METRICS:
        return "grid";
      case AnalyticsCardType.TARGETS:
        return "target";
    }
  }
</script>

{#if accessPoint === ResourceAccessPoint.GOAL}
  <ContextMenuAction
    id="chart-selector"
    icon={resolveChartIcon(selected)}
    menuResolver={() => {
      return [
        {
          group: "charts",
          items: chartTypes.filter((x) => x.groupId !== "other")
        }
      ];
    }}
    actionBgSize={Size.sm}
    on:action={(event) => {
      const val = event.detail;
      if (!val) return;
      selected = val;
    }}
  />
{:else}
  <DropDown
    parentBackgroundIndex={1}
    on:select
    bind:value={selected}
    items={chartTypes}
    {groups}
    style={InputStyle.BORDERED}
    isDisableSearch={true}
  />
{/if}

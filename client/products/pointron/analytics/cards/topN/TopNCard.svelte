<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import {
    AnalyticsCardGrouping,
    type AnalyticsCard,
    type AnalyticsDataRecord,
    type TopNCardDataRecord
  } from "../../analytics.types";
  import LabelColumnCell from "./LabelColumnCell.svelte";
  import PreviousValueColumnCell from "./PreviousValueColumnCell.svelte";
  import ValueColumnCell from "./ValueColumnCell.svelte";

  export let card: AnalyticsCard;
  export let data: AnalyticsDataRecord[];
  export let previousTimePeriodData: AnalyticsDataRecord[] = [];
  export let goalColors: { label: string; color: number }[] = [];
  let top: TopNCardDataRecord[] = [];

  calculate();

  function resolveKey(record: AnalyticsDataRecord) {
    return card.grouping === AnalyticsCardGrouping.TOP_LEVEL_GOALS
      ? record.topLevelGoal
      : record.goal;
  }

  function resolveGoalColor(goal: string) {
    const color = goalColors.find((x) => x.label === goal);
    if (color) {
      return color.color;
    }
    const parent = data.find((x) => x.goal === goal)?.topLevelGoal;
    const parentColor = goalColors.find((x) => x.label === parent);
    if (parentColor) {
      return parentColor.color;
    }
    return 0;
  }
  function calculate() {
    let sumFocusByGoal: { [goal: string]: number } = {};
    for (let record of data) {
      if (sumFocusByGoal[resolveKey(record)]) {
        sumFocusByGoal[resolveKey(record)] += record.focus;
      } else {
        sumFocusByGoal[resolveKey(record)] = record.focus;
      }
    }
    top = Object.entries(sumFocusByGoal)
      .sort(([, focusA], [, focusB]) => focusB - focusA)
      .map(([goal, focus]) => {
        return {
          label: !isValidString(goal) ? "No goal" : goal,
          id: goal,
          value: focus,
          previousValue: calculatePrevious(goal)?.focus ?? 0,
          color: resolveGoalColor(goal)
        };
      })
      .slice(0, 10);
  }

  function calculatePrevious(goal: string) {
    let sumFocusByGoal: { [goal: string]: number } = {};
    for (let record of previousTimePeriodData) {
      if (sumFocusByGoal[resolveKey(record)]) {
        sumFocusByGoal[resolveKey(record)] += record.focus;
      } else {
        sumFocusByGoal[resolveKey(record)] = record.focus;
      }
    }

    let previousEntry = Object.entries(sumFocusByGoal)
      .map(([goal, focus]) => {
        return {
          goal,
          focus
        };
      })
      .find((entry) => entry.goal === goal);
    return previousEntry;
  }
  const columns: TableColumn[] = [
    {
      key: "label",
      label: "Goal",
      type: TableCellType.CUSTOM,
      component: LabelColumnCell,
      width: $view.isPortrait ? 1.2 : 3
    },
    {
      key: "value",
      label: "Total focus",
      type: TableCellType.CUSTOM,
      component: ValueColumnCell
    }
  ];
  if (!$view.isPortrait) {
    columns.push({
      key: "previousValue",
      label: "Change",
      type: TableCellType.CUSTOM,
      component: PreviousValueColumnCell
    });
  }
</script>

<div class="flex flex-col gap-2 w-full flex-grow">
  <Table2 {columns} data={top} />
  {#if !isValidArrayWithData(top)}
    <EmptyStatusView
      size={Size.sm}
      mainText="No data present."
      subText="Please select a different time range to see data."
    />
  {/if}
</div>

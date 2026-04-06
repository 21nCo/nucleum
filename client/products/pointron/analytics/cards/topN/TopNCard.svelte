<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Table2 from "@21n/elements/table/Table2.svelte";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import {
    TableCellType,
    type TableColumn
  } from "@21n/types/table.type";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import {
    type IAnalyticsCard,
    type AnalyticsDataRecord
  } from "@21n/products/pointron/analytics/analytics.types";
  import LabelColumnCell from "@21n/products/pointron/analytics/cards/topN/LabelColumnCell.svelte";
  import PreviousValueColumnCell from "@21n/products/pointron/analytics/cards/topN/PreviousValueColumnCell.svelte";
  import ValueColumnCell from "@21n/products/pointron/analytics/cards/topN/ValueColumnCell.svelte";

  let {
    card,
    data,
    previousTimePeriodData = [],
    goalColors = []
  }: {
    card: IAnalyticsCard;
    data: AnalyticsDataRecord[];
    previousTimePeriodData?: AnalyticsDataRecord[];
    goalColors?: { label: string; color: number }[];
  } = $props();

  function resolveKey(record: AnalyticsDataRecord) {
    return card.isGroupByTopLevelGoals ? record.topLevelGoal : record.goal;
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

  let top = $derived.by(() => {
    let sumFocusByGoal: { [goal: string]: number } = {};
    for (let record of data) {
      if (sumFocusByGoal[resolveKey(record)]) {
        sumFocusByGoal[resolveKey(record)] += record.focus;
      } else {
        sumFocusByGoal[resolveKey(record)] = record.focus;
      }
    }
    return Object.entries(sumFocusByGoal)
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
  });

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
  let columns = $derived.by(() => {
    const nextColumns: TableColumn[] = [
      {
        key: "label",
        label: "Goal",
        type: TableCellType.CUSTOM,
        component:
          LabelColumnCell as unknown as ConstructorOfATypedSvelteComponent,
        width: $view.isPortrait ? 1.2 : 3
      },
      {
        key: "value",
        label: "Total focus",
        type: TableCellType.CUSTOM,
        component:
          ValueColumnCell as unknown as ConstructorOfATypedSvelteComponent
      }
    ];
    if (!$view.isPortrait) {
      nextColumns.push({
        key: "previousValue",
        label: "Change",
        type: TableCellType.CUSTOM,
        component:
          PreviousValueColumnCell as unknown as ConstructorOfATypedSvelteComponent
      });
    }
    return nextColumns;
  });
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

<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { type IAnalyticsCard } from "../analytics.types";
  import GroupingAndFiltersPopover from "./GroupingAndFiltersPopover.svelte";
  export let card: IAnalyticsCard;
  export let onGroupByChange: (e: CustomEvent) => void;
  export let parentBgIndex: number = 1;
</script>

<div
  use:popover={{
    content: GroupingAndFiltersPopover,
    placement: Placement.BottomRight,
    isRenderAsModalForCW: true,
    id: "analytics-grouping-filters-popover",
    componentProps: {
      isGroupByTopLevelGoals: card.isGroupByTopLevelGoals,
      onGroupByChange
    }
  }}
>
  <Button
    icon="sliders"
    label={$view.isPortrait ? "" : "Options"}
    {parentBgIndex}
    isPreventMinWidth={true}
    tooltip={$view.isPortrait ? "Filters and grouping" : ""}
    size={$view.isPortrait ? Size.lg : Size.xs}
  />
</div>

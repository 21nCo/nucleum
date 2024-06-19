<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import view from "$lib/client/stores/view.store";
  import { Direction, Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    AnalyticsCardGrouping,
    type AnalyticsCard
  } from "../analytics.types";
  export let card: AnalyticsCard;
  export let parentBgIndex: number = 1;
</script>

<Popover options={{ placement: Direction.BottomRight }}>
  <Button
    icon="funnel"
    label={$view.isPortrait ? "" : "Options"}
    {parentBgIndex}
    tooltip={$view.isPortrait ? "Filters and grouping" : ""}
    size={$view.isPortrait ? Size.sm : Size.xs}
    on:click={() => {
      //TODO - open popover
    }}
  />
  <div class="w-96 h-60 flex flex-col p-2 items-center" slot="popover">
    <span> Grouping and Filters </span>
    <DropDown
      label={{ label: "Grouping", orientation: Orientation.Vertical }}
      items={[
        { value: AnalyticsCardGrouping.DEFAULT, label: "None" },
        {
          value: AnalyticsCardGrouping.TOP_LEVEL_GOALS,
          label: "Top level goals"
        },
        {
          value: AnalyticsCardGrouping.TAGS,
          label: "Tags"
        }
      ]}
      bind:value={card.grouping}
      on:select
    />
  </div>
</Popover>

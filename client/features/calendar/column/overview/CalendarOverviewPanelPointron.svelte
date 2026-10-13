<script lang="ts">
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { TimeScale } from "@21n/shared-utils/datetime/period.type";
  import OnThisDayPanel from "@nucleum/features/calendar/column/overview/OnThisDayPanel.svelte";
  import ScrollViewBottomSpacer from "@21n/ui/compositions/scrollView/ScrollViewBottomSpacer.svelte";
  import CalendarOverviewFocusMetrics from "./CalendarOverviewFocusMetrics.svelte";

  let {
    date,
    scale = TimeScale.DAYS,
    isRewind = false
  }: {
    date: Date;
    scale?: TimeScale;
    isRewind?: boolean;
  } = $props();

</script>

<div class="flex flex-col gap-4 h-full w-full">
  <CalendarOverviewFocusMetrics {date} {scale} />
  {#if !isRewind}
    <div class="flex flex-col gap-4">
      <Text content="On this day" style={TextStyle.SECTION_HEADING} />
      <OnThisDayPanel {date} />
    </div>
  {/if}
  <ScrollViewBottomSpacer />
</div>

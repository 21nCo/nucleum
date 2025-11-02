<script lang="ts">
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { CalendarColumnPanel } from "@21n/components/calendar/calendar.type";
  import CalendarHistoryPanel from "@21n/components/calendar/column/CalendarHistoryPanel.svelte";
  import CalendarNotesPanel from "@21n/components/calendar/column/CalendarNotesPanel.svelte";
  import CalendarOverviewPanel from "@21n/components/calendar/column/overview/CalendarOverviewPanel.svelte";
  import { cn } from "@21n/utils/ui.utils";
  export let selectedPanel: CalendarColumnPanel;
  export let date: Date;
  export let scale: TimeScaleUnit;
  export let isRewind: boolean = false;
  export let mdId: string;
</script>

<div
  class={cn("flex-grow", {
    "p-3": selectedPanel !== CalendarColumnPanel.Notes,
    "p-2": selectedPanel === CalendarColumnPanel.Notes
  })}
>
  {#if selectedPanel === CalendarColumnPanel.Activity}
    <CalendarHistoryPanel {date} isInline={true} />
  {:else if selectedPanel === CalendarColumnPanel.Overview}
    <CalendarOverviewPanel {date} {isRewind} />
  {:else if selectedPanel === CalendarColumnPanel.Notes}
    <CalendarNotesPanel {date} {scale} {mdId} />
  {/if}
</div>

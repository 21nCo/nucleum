<script lang="ts">
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { CalendarColumnPanel } from "@21n/components/calendar/calendar.type";
  import CalendarHistoryPanel from "@21n/components/calendar/column/CalendarHistoryPanel.svelte";
  import CalendarNotesPanel from "@21n/components/calendar/column/CalendarNotesPanel.svelte";
  import CalendarOverviewPanel from "@21n/components/calendar/column/overview/CalendarOverviewPanel.svelte";
  export let selectedPanel: CalendarColumnPanel;
  export let date: Date;
  export let scale: TimeScaleUnit;
  export let isRewind: boolean = false;
  export let mdId: string;
</script>

{#if selectedPanel === CalendarColumnPanel.History}
  <CalendarHistoryPanel {date} isInline={true} />
{:else if selectedPanel === CalendarColumnPanel.Overview}
  <CalendarOverviewPanel {date} {isRewind} />
{:else if selectedPanel === CalendarColumnPanel.Notes}
  <CalendarNotesPanel {date} {scale} {mdId} />
{/if}

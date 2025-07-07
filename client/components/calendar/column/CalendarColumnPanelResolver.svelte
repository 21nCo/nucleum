<script lang="ts">
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { CalendarColumnPanel } from "../calendar.type";
  import CalendarHistoryPanel from "./CalendarHistoryPanel.svelte";
  import CalendarNotesPanel from "./CalendarNotesPanel.svelte";
  import CalendarOverviewPanel from "./overview/CalendarOverviewPanel.svelte";
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

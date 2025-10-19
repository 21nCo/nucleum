<script lang="ts">
  import CalendarHistoryPanel from "@21n/components/calendar/column/CalendarHistoryPanel.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  export let date: Date = new Date(
    $page.url.searchParams.get(AppSearchParam.DATE) ?? new Date().toISOString()
  );
</script>

<CalendarHistoryPanel {date} />

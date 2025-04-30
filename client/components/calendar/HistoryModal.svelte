<script lang="ts">
  import CalendarHistoryPanel from "./column/CalendarHistoryPanel.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { page } from "$app/stores";
  export let date: Date = new Date(
    $page.url.searchParams.get(AppSearchParam.DATE) ?? new Date().toISOString()
  );
</script>

<CalendarHistoryPanel {date} />

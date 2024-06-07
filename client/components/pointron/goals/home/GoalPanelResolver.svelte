<script lang="ts">
  import { GoalTab } from "$lib/client/types/goalTabs.enum";
  import GoalAnalytics from "../../analytics/goalAnalytics/GoalAnalytics.svelte";
  import Logs from "../Logs.svelte";
  import InfoPage from "../information/InfoPage.svelte";
  export let selectedTab: GoalTab;
</script>

{#if selectedTab === GoalTab.Analytics}
  <GoalAnalytics />
{:else if selectedTab === GoalTab.LOGS}
  <Logs />
{:else if selectedTab === GoalTab.Overview}
  <InfoPage />
{/if}

<script lang="ts">
  import { AnalyticsPersistence } from "$lib/client/components/pointron/analytics/analytics.persistence";
  import { currentGoal } from "$lib/client/components/pointron/goals/goal.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { onMount } from "svelte";
  import GoalAggFocusView from "./GoalAggFocusView.svelte";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import GoalAnalyticsChart from "./GoalAnalyticsChart.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  let isLoadingState = false;
  let analytics: any = {
    aggs: [],
    charts: []
  };
  onMount(async () => {
    if (!$currentGoal.analytics?.periods) {
      return;
    }
    isLoadingState = true;
    const response = await new AnalyticsPersistence().fetchGoalAnalytics(
      $currentGoal.id,
      $currentGoal.analytics?.periods
    );
    isLoadingState = false;
    if (!response) return;
    analytics = response;
  });
</script>

{#if isLoadingState}
  <EmptyStatusView {isLoadingState} loadingText="Loading..." />
{:else}
  <div class="flex flex-col grow gap-8">
    <div class="flex gap-4 flex-wrap items-center justify-center">
      {#if isValidArrayWithData(analytics.aggs)}
        {#each analytics.aggs as agg, index ({ agg })}
          <GoalAggFocusView scale={agg.scale} value={agg.value} />
        {/each}
      {/if}
    </div>
    <!-- {#if $currentGoal.analytics?.periods[0] && analytics.charts?.[0]}
    <GoalAnalyticsChart
      timePeriod={$currentGoal.analytics?.periods[0]}
      data={analytics.charts[0]}
    />
  {/if} -->
    <div class="grow">
      <ComingSoonView
        subText="Detailed goal analytics and logs will be available soon..."
        size={Size.sm}
      />
    </div>
  </div>
{/if}

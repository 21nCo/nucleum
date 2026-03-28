<script lang="ts">
  import EmptyStatus from "@21n/illustrations/EmptyStatus.svelte";
  import EmptyStatusInbox from "@21n/illustrations/EmptyStatusInbox.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import PageLoadingPulse from "@21n/elements/feedback/animations/PageLoadingPulse.svelte";
  import LogsLoadingPulse from "@21n/elements/feedback/animations/LogsPulse/LogsLoadingPulse.svelte";
  import DashboardLoadingPulse from "@21n/elements/feedback/animations/DashboardPulse/DashboardLoadingPulse.svelte";
  import NoResultsIllustration from "@21n/illustrations/NoResultsIllustration.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import ComingSoon from "@21n/illustrations/pixelsmarket/ComingSoon.svelte";
  import QuickFocusItemsGridPulse from "@21n/elements/feedback/animations/thumbnailPulse/QuickFocusItemsGridPulse.svelte";
  import QuickFocusItemPulse from "@21n/elements/feedback/animations/thumbnailPulse/QuickFocusItemPulse.svelte";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import InboxZero from "@21n/illustrations/InboxZero.svelte";
  import Travel from "@21n/illustrations/Travel.svelte";
  import Check from "@21n/illustrations/Check.svelte";
  import Globe from "@21n/illustrations/Globe.svelte";
  import MatchNotFound from "@21n/illustrations/MatchNotFound.svelte";
  import PageNotFoundIllustration from "@21n/illustrations/PageNotFoundIllustration.svelte";
  import OverviewCardsPulse from "@21n/elements/feedback/animations/DashboardPulse/OverviewCardsPulse.svelte";
  import OnThisDayPulse from "@21n/elements/feedback/animations/DashboardPulse/OnThisDayPulse.svelte";
  import AnalyticsChartPulse from "@21n/elements/feedback/animations/DashboardPulse/AnalyticsChartPulse.svelte";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let isLoadingState: boolean = false;
  export let isSearchContext: boolean = false;
  export let isNotAvailableContext: boolean = false;
  export let actionText: string | undefined = undefined;
  export let actionShortcut: string | IKeyboardShortcut | undefined = undefined;
  export let loadingText: string | undefined = undefined;
  export let loadingAnimation: LoadingAnimationType =
    LoadingAnimationType.SPINNER;
  export let pulseCount: number = 0;
  export let parentBgIndex: number = 1;
  export let emptyIllustration: string | undefined = undefined;
  export let isFullPage: boolean = false;
  $: isFullPage;
</script>

<div
  class={cn("flex flex-col w-full h-full justify-center items-center px-2", {
    "gap-6": size !== Size.sm,
    "gap-3": size === Size.sm
  })}
>
  {#if isLoadingState && loadingAnimation === LoadingAnimationType.SPINNER}
    <div class="text-fgs3 text-b3 flex flex-col gap-4 items-center">
      <!-- <InlineLoadingAnimation /> -->
      <!-- <PageLoadingAnimation variant="panel-refresh" /> -->
      <Icon icon="svg-spinners:180-ring-with-bg" size={Size.lg} />
      {#if loadingText}
        <div>{loadingText}</div>
      {/if}
    </div>
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.PAGE_PULSE}
    <PageLoadingPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.LOGS_PULSE}
    <LogsLoadingPulse count={pulseCount} />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.DASHBOARD_PULSE}
    <DashboardLoadingPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.QUICK_FOCUS_ITEMS_GRID_PULSE}
    <QuickFocusItemsGridPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.FOCUS_ITEMS_PULSE}
    <QuickFocusItemPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.OVERVIEW_CARDS_PULSE}
    <OverviewCardsPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.ON_THIS_DAY_PULSE}
    <OnThisDayPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.ANALYTICS_CHART_PULSE}
    <AnalyticsChartPulse />
  {:else}
    {#if isSearchContext}
      {@const random = Math.random()}
      <div
        class={cn({
          "h-20 w-20": size === Size.sm,
          "h-32 w-32": size === Size.md,
          "h-40 w-40": size === Size.lg
        })}
      >
        {#if random < 0.33}
          <NoResultsIllustration />
        {:else if random < 0.66}
          <MatchNotFound />
        {:else}
          <PageNotFoundIllustration />
        {/if}
      </div>
    {:else if isNotAvailableContext}
      <ComingSoon width={size === Size.sm ? 120 : 200} />
    {:else if emptyIllustration === "inboxZero"}
      <InboxZero />
    {:else if emptyIllustration === "travel"}
      <Travel />
    {:else if emptyIllustration === "check"}
      <Check />
    {:else if emptyIllustration === "globe"}
      <Globe />
    {:else if size === Size.sm}
      <EmptyStatusInbox width={40} />
      <!-- <EmptyStatus size={Size.sm} /> -->
    {:else}
      <EmptyStatus {size} />
    {/if}
    <div class="flex flex-col gap-0.5 items-center">
      <div class="text-fgs2 text-b2 text-center">
        {mainText ?? (isSearchContext ? "No results found." : "")}
      </div>
      <div class="text-fgs3 text-center text-b3">
        {#if $$slots.subtext}
          <slot name="subtext" />
        {:else}
          {@html renderMdAsHtml(subText ?? "")}
        {/if}
      </div>
      <slot />
      {#if actionText}
        <div class="mt-4">
          <Button
            label={actionText}
            size={Size.xs}
            on:click
            {parentBgIndex}
            shortcut={actionShortcut}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

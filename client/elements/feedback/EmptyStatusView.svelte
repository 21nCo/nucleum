<script lang="ts">
  import EmptyStatus from "../../illustrations/EmptyStatus.svelte";
  import EmptyStatusInbox from "../../illustrations/EmptyStatusInbox.svelte";
  import { LoadingAnimationType } from "../../types/feedback.type";
  import { Size } from "../../types/size.enum";
  import PageLoadingAnimation from "./animations/PageLoadingAnimation.svelte";
  import Button from "../button/Button.svelte";
  import PageLoadingPulse from "./animations/PageLoadingPulse.svelte";
  import LogsLoadingPulse from "./animations/LogsPulse/LogsLoadingPulse.svelte";
  import DashboardLoadingPulse from "./animations/DashboardPulse/DashboardLoadingPulse.svelte";
  import NoResultsIllustration from "$lib/client/illustrations/NoResultsIllustration.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let isLoadingState: boolean = false;
  export let isSearchContext: boolean = false;
  export let actionText: string | undefined = undefined;
  export let loadingText: string | undefined = undefined;
  export let loadingAnimation: LoadingAnimationType =
    LoadingAnimationType.SPINNER;
  export let pulseCount: number = 0;
  export let parentBgIndex: number = 1;
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2 px-2">
  {#if isLoadingState && loadingAnimation === LoadingAnimationType.SPINNER}
    <div class="text-fgs3 text-b3 flex flex-col gap-2 items-center">
      <!-- <InlineLoadingAnimation /> -->
      <PageLoadingAnimation variant="panel-refresh" />
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
  {:else}
    <div class="flex flex-col gap-4 items-center">
      {#if isSearchContext}
        <div
          class={cn({
            "h-20 w-20": size === Size.sm,
            "h-32 w-32": size === Size.md,
            "h-40 w-40": size === Size.lg
          })}
        >
          <NoResultsIllustration />
        </div>
      {:else if size === Size.sm}
        <EmptyStatusInbox width={40} />
        <!-- <EmptyStatus size={Size.sm} /> -->
      {:else}
        <EmptyStatus {size} />
      {/if}

      <div>{mainText ?? (isSearchContext ? "No results found." : "")}</div>
    </div>
    <div class="text-fgs3 text-center text-b3">
      {#if $$slots.subtext}
        <slot name="subtext" />
      {:else}
        {subText ?? ""}
      {/if}
    </div>
    {#if actionText}
      <Button label={actionText} size={Size.xs} on:click {parentBgIndex} />
    {/if}
  {/if}
</div>

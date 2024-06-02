<script lang="ts">
  import EmptyStatus from "../../illustrations/EmptyStatus.svelte";
  import EmptyStatusInbox from "../../illustrations/EmptyStatusInbox.svelte";
  import { LoadingAnimationType } from "../../types/feedback.type";
  import { Size } from "../../types/size.enum";
  import PageLoadingAnimation from "./animations/PageLoadingAnimation.svelte";
  import Button from "../button/Button.svelte";
  import PageLoadingPulse from "./animations/PageLoadingPulse.svelte";
  import LogsLoadingPulse from "./animations/LogsPulse/LogsLoadingPulse.svelte";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;
  export let isLoadingState: boolean = false;
  export let actionText: string | undefined = undefined;
  export let loadingText: string = "Refreshing...";
  export let loadingAnimation: LoadingAnimationType =
    LoadingAnimationType.SPINNER;
  export let pulseCount: number = 0;
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2 px-2">
  {#if isLoadingState && loadingAnimation === LoadingAnimationType.SPINNER}
    <div class="text-fgs3 text-b3 flex flex-col gap-2 items-center">
      <!-- <InlineLoadingAnimation /> -->
      <PageLoadingAnimation variant="panel-refresh" />
      <div>{loadingText}</div>
    </div>
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.PAGE_PULSE}
    <PageLoadingPulse />
  {:else if isLoadingState && loadingAnimation === LoadingAnimationType.LOGS_PULSE}
    <LogsLoadingPulse count={pulseCount} />
  {:else}
    <div class="flex flex-col gap-1 items-center">
      {#if size === Size.sm}
        <EmptyStatusInbox width={40} />
      {:else}
        <EmptyStatus />
      {/if}
      <div>{mainText ?? ""}</div>
    </div>
    <div class="text-fgs3 text-center text-b3">
      {#if $$slots.subtext}
        <slot name="subtext" />
      {:else}
        {subText ?? ""}
      {/if}
    </div>
    {#if actionText}
      <Button label={actionText} size={Size.xs} on:click />
    {/if}
  {/if}
</div>

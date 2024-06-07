<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  import SessionLogPage from "./logPage/SessionLogPage.svelte";
  import BackButton from "$lib/client/elements/button/BackButton.svelte";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { pointronEvents } from "$lib/client/components/pointron/local.store";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import LogThumbnailItem from "./LogThumbnailItem.svelte";
  import { logsPaneStore } from "./log.store";
  import DaySummaryPart from "./daySummary/DaySummaryPart.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  export let date: Date = new Date();
  export let context: "journal" | "logs" = "logs";
  let selectedId: string | undefined = undefined;
  $: dateString = date.toISOString().split("T")[0];
  $: if (dateString) refresh();
  onMount(async () => {
    postMessageToParent(EmbedMessage.SHEET_MOUNTED);
    const sub = pointronEvents.subscribe(async (x) => {
      if (x.event === PointronEventEnum.REFRESH_LOGS) {
        await refresh();
      }
    });
    return () => {
      sub();
      logsPaneStore.reset();
    };
  });
  onDestroy(() => {
    logsPaneStore.reset();
  });
  async function refresh() {
    logsPaneStore.refresh(date);
  }
</script>

{#if selectedId}
  <div class="flex flex-col items-start gap-4 h-full">
    <div class="h-10">
      <BackButton
        text="Back to all logs"
        on:click={() => {
          selectedId = undefined;
        }}
      />
    </div>
    <SessionLogPage
      id={selectedId}
      log={$logsPaneStore.logs.find((x) => x.id === selectedId)}
    />
  </div>
{:else}
  <div
    class="relative flex flex-col gap-4 items-center w-full flex-grow overflow-y-auto"
  >
    {#if context === "logs"}
      <div class="flex w-full justify-start items-center gap-8">
        <div class="flex grow justify-between gap-4 px-4">
          <Icon
            icon="chevleft"
            size={Size.lg}
            on:click={() => {
              date.setDate(date.getDate() - 1);
              refresh();
            }}
          />
          <!-- <input
            class="bg-bgs2 flex-grow rounded-md {context === 'journal-portrait'
              ? 'py-1 px-2'
              : 'py-2 px-4'}"
            type="date"
            bind:value={dateString}
            on:change={(e) => {
              selectedDate = new Date(dateString);
              refresh();
            }}
          /> -->
          <DatePicker
            variant="wide-center"
            {date}
            on:change={(e) => {
              date = e.detail.date;
              refresh();
            }}
          />
          <Icon
            icon="chevright"
            size={Size.lg}
            on:click={() => {
              date.setDate(date.getDate() + 1);
              refresh();
            }}
          />
        </div>
      </div>
    {/if}
    {#if !$logsPaneStore.isRefreshing && $logsPaneStore.logs.length > 0}
      <DaySummaryPart summary={$logsPaneStore.summary} />
      <div
        class="w-full flex flex-col gap-4 pb-20 flex-grow overflow-y-auto {context ===
        'logs'
          ? $view.isPortrait
            ? 'px-2'
            : 'px-8'
          : ''}"
      >
        {#each $logsPaneStore.logs as log, index}
          <LogThumbnailItem
            {log}
            {context}
            isLast={index === $logsPaneStore.logs.length - 1}
            on:click={() => {
              if (context === "journal") {
                appStore.runAction(PointronEventEnum.SESSION_LOG_MODAL, {
                  id: log.id
                });
                return;
              }
              selectedId = log.id;
            }}
            on:refresh={refresh}
          />
        {/each}
      </div>
    {:else}
      <EmptyStatusView
        size={Size.sm}
        loadingAnimation={LoadingAnimationType.LOGS_PULSE}
        pulseCount={2}
        isLoadingState={$logsPaneStore.isRefreshing}
        mainText="No session logs for this date"
        subText="Please select a different date to see logs"
      />
    {/if}
  </div>
{/if}

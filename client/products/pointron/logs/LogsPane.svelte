<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  import SessionLogPage from "@21n/products/pointron/logs/logPage/SessionLogPage.svelte";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import LogThumbnailItem from "@21n/products/pointron/logs/LogThumbnailItem.svelte";
  import DaySummaryPart from "@21n/products/pointron/logs/daySummary/DaySummaryPart.svelte";
  import { appStore } from "@21n/stores/app.store";
  import ScrollView from "@21n/layout/scrollView/ScrollView.svelte";
  import type {
    DaySummary,
    ISessionThumb
  } from "@21n/products/pointron/logs/log.type";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { sessionStore } from "@21n/products/pointron/focus/session.store";
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { generateSummary } from "@21n/products/pointron/focus/session.utils";

  export let date: Date = new Date();

  export let context: "journal" | "logs" = "logs";
  let selectedId: string | undefined = undefined;
  let isRefreshing: boolean = false;
  let sessions: (ISessionThumb & {
    splits: { focus: number; brek: number };
  })[] = [];
  let summary: DaySummary = { focus: 0, break: 0 };
  $: dateString = date.toISOString().split("T")[0];
  $: if (dateString) refresh();
  onMount(() => {
    postMessageToParent(EmbedMessage.SHEET_MOUNTED);
  });
  async function refresh() {
    isRefreshing = true;
    const dayFilter = tzStore.resolveTimePeriodFilterForDay(date);
    const result = await sessionStore.selectManyWithItemsExpansion(
      {
        filters: {
          startUnix: dayFilter
        },
        orderBy: {
          startUnix: "asc"
        }
      },
      {
        isExpand: true
      }
    );
    if (isValidArrayWithData(result)) {
      sessions = result!.map((session: ISessionThumb) => ({
        ...session,
        splits: resolveSessionTimeSplit(session)
      }));
      summary = generateSummary(sessions);
    }
    isRefreshing = false;
  }

  function onChangesSubscription(event: any) {
    refresh();
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
      log={sessions.find(resourceInList(selectedId))}
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
            icon="chevron-left"
            size={Size.lg}
            on:click={() => {
              let newDate = new Date(date.getTime());
              newDate.setDate(newDate.getDate() - 1);
              date = newDate;
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
            bind:date
            on:change={(e) => {
              date = e.detail;
              refresh();
            }}
          />
          <Icon
            icon="chevron-right"
            size={Size.lg}
            on:click={() => {
              let newDate = new Date(date.getTime());
              newDate.setDate(date.getDate() + 1);
              date = newDate;
              refresh();
            }}
          />
        </div>
      </div>
    {/if}
    {#if !isRefreshing && sessions.length > 0}
      <DaySummaryPart {summary} />
      <ScrollView
        class={{
          "w-full flex flex-col gap-4 flex-grow": true,
          "px-2": $view.isPortrait && context === "logs",
          "px-8": !$view.isPortrait && context === "logs"
        }}
      >
        {#each sessions as session, index}
          <LogThumbnailItem
            {session}
            {context}
            isLast={index === sessions.length - 1}
            on:click={() => {
              if (context === "journal") {
                appStore.openResource(session.id, AccessMode.POP);
                return;
              }
              selectedId = session.id;
            }}
            on:refresh={refresh}
          />
        {/each}
      </ScrollView>
    {:else}
      <EmptyStatusView
        size={Size.sm}
        loadingAnimation={LoadingAnimationType.LOGS_PULSE}
        isSearchContext={true}
        pulseCount={2}
        isLoadingState={isRefreshing}
        mainText="No sessions found"
        subText="Please select a different date to see focus sessions"
      />
    {/if}
  </div>
{/if}

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  subscribeToContext={new Set([
    PointronAction.DELETE_SESSION,
    PointronAction.MANUAL_FOCUS_ENTRY
  ])}
  on:change={onChangesSubscription}
/>

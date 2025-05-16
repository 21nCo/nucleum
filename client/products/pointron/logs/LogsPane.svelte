<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  import SessionLogPage from "./logPage/SessionLogPage.svelte";
  import BackButton from "$lib/client/elements/button/BackButton.svelte";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import LogThumbnailItem from "./LogThumbnailItem.svelte";
  import DaySummaryPart from "./daySummary/DaySummaryPart.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";
  import type { DaySummary, ISessionThumb } from "./log.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { sessionStore } from "../focus/session.store";
  import { resolveSessionTimeSplit } from "../pointron.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import { generateSummary } from "../focus/session.utils";

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
    const result = await sessionStore.selectMany(
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
    console.log({ result });
    if (isValidArrayWithData(result)) {
      sessions = result.map((session: ISessionThumb) => ({
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
            icon="chevleft"
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
            icon="chevright"
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
                appStore.openResource(session.id, ResourceAccessMode.POP);
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

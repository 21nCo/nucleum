<script lang="ts">
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    isValidDataString,
    isValidMarkdown
  } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import LogIntervalBar from "./LogIntervalBar.svelte";
  import LogTotals from "./LogTotals.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { transformFocusItemsV1 } from "$lib/client/products/pointron/focus/session.utils";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import FocusItem from "../../focus/elements/focusitem/FocusItem.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { formatTime, isSameDateTime } from "$lib/client/utils/time.utils";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { pointSessionStore } from "../../focus/session.store";
  export let id: string;
  export let log: any = undefined;
  let selectedTab: "Summary" | "Notes" = "Summary";
  let isLoadingState: boolean = false;
  let focusItems: any[] = [];
  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    isLoadingState = true;
    const response = await pointSessionStore.fetch(id);
    console.log("session log response", response);
    if (response && response.id) {
      log = response;
      if (
        log.tasks &&
        log.tasks.length > 0 &&
        log.logs &&
        log.logs.length > 0
      ) {
        calculateWorkedTimeV1();
        focusItems = transformFocusItemsV1(log.tasks);
        console.log("focusItems", { focusItems, goals: log.goals });
        focusItems = focusItems.map((item) => {
          const goal = log.goals.find((x: any) => x.id === item.goalId);
          item.label = goal.label ?? item.label;
          item.color = goal.color ?? goal.parent.color ?? item.color;
          return item;
        });
      }
    }
    isLoadingState = false;

    function calculateWorkedTimeV1() {
      log.tasks = log.tasks.map((item: any) => {
        const logsForTask = log.logs.filter(
          (x: any) =>
            (x.taskId === item.taskId && x.goalId === item.goalId) ||
            (x.goalId === item.goalId && !x.taskId)
        );
        console.log({ logsForTask, item });
        item.worked = logsForTask.reduce(
          (acc: number, curr: any) => acc + curr.totalFocus,
          0
        );
        return item;
      });
    }
  }
</script>

{#if log}
  <div class="flex flex-col gap-4 px-2 flex-grow w-full items-center">
    <LogIntervalBar {log} />
    {#if isValidDataString(log?.plannedEnd) && !isSameDateTime(new Date(log.end), new Date(log.plannedEnd))}
      <InlineInfoBanner>
        This Session was planned to end at <b>
          {formatTime($userPreferences, new Date(log.plannedEnd))}</b
        >
        but aborted at <b>{formatTime($userPreferences, new Date(log.end))}.</b>
      </InlineInfoBanner>
    {/if}
    <div class="flex flex-col gap-6 w-full flex-grow items-center">
      <div>
        <PanelSwitcher
          items={["Summary", "Notes"]}
          style={PanelSwitcherStyle.TRAIN}
          size={Size.sm}
          bind:value={selectedTab}
        />
      </div>
      {#if selectedTab === "Notes" && isValidMarkdown(log.notes)}
        <div class="flex flex-col h-full w-full rounded-md overflow-auto">
          <Markdown
            md={log.notes}
            params={{
              isReadOnly: true,
              actions: ["copy"],
              title: "Think Notes"
            }}
          />
        </div>
      {:else if selectedTab === "Notes"}
        <EmptyStatusView
          size={Size.sm}
          subText="No notes taken during this session"
        />
      {:else}
        <div class="flex flex-col gap-6 overflow-auto w-full flex-grow">
          <LogTotals {log} />
          <div class="flex flex-col items-start gap-2 w-full">
            <Text content="Focus items" style={TextStyle.SECTION_HEADING} />
            <div class="flex flex-col gap-2 h-full w-full pb-40">
              {#if focusItems.length}
                {#each focusItems as item, index (item)}
                  <FocusItem {item} contxt="history" />
                {/each}
              {:else}
                <EmptyStatusView
                  size={Size.sm}
                  {isLoadingState}
                  subText="No focus items found"
                />
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
    <ModalFooter
      primaryAction={{
        label: "Delete log",
        icon: "trash",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          appStore.runAction(PointronAction.DELETE_SESSION, {
            componentParams: { id: log.id }
          });
        }
      }}
      secondaryAction={{ label: "Close" }}
      on:close={(event) => {
        if (event.detail === "primary") return;
        modalEvent.hideSpecific(PointronAction.SESSION_LOG_MODAL);
      }}
    />
  </div>
{:else}
  <EmptyStatusView
    {isLoadingState}
    mainText="Session log not found"
    loadingText="Loading..."
  />
{/if}

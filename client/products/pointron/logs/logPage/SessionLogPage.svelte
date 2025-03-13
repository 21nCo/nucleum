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
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import FocusItem from "../../focus/elements/focusitem/FocusItem.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatTime, isSameDateTime } from "$lib/client/utils/time.utils";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { sessionStore } from "../../focus/session.store";
  import type { IFocusTask } from "$lib/client/types/pointron/session.type";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  export let id: string;
  export let log: any = undefined;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  let selectedTab: "Summary" | "Notes" = "Summary";
  let isLoadingState: boolean = false;

  let focusItems: any[] = [];
  /**
   * @deprecated
   */
  let tasksList: IFocusTask[] = [];

  let goals: IGoalThumb[] = [];
  let tasks: ITaskThumb[] = [];

  onMount(async () => {
    await refreshv2();
  });

  /**
   * @deprecated - use refreshv2 instead
   */
  async function refresh() {
    isLoadingState = true;
    const response = await sessionStore.select(id);
    if (response && response.id) {
      log = response;
      if (
        log.goals &&
        log.goals.length > 0 &&
        log.logs &&
        log.logs.length > 0
      ) {
        calculateWorkedTimeV1();
        tasksList = log.goals
          .filter((x) => x.taskId)
          .map((x) => {
            return {
              id: x.taskId,
              label: x.label,
              worked: x.worked,
              estimated: x.estimate,
              checked: x.checked
            };
          });
        focusItems = log.goals
          .filter((x) => !x.taskId)
          .map((x) => {
            return {
              id: x.goalId,
              tasks: log.goals
                .filter((y) => y.goalId === x.goalId && y.taskId)
                .map((y) => y.taskId),
              worked: x.worked,
              estimated: x.estimate
            };
          });
      } else if (
        log.focusItems &&
        log.focusItems.goals &&
        log.focusItems.tasks
      ) {
        tasksList = log.focusItems.goals;
        focusItems = log.focusItems.tasks;
      }
    }
    isLoadingState = false;

    /**
     * Calculates the worked time - using the v1 schema of PointSession
     */
    function calculateWorkedTimeV1() {
      log.tasks = log.tasks.map((item: any) => {
        const logsForTask = log.logs.filter(
          (x: any) =>
            (x.taskId === item.taskId && x.goalId === item.goalId) ||
            (x.goalId === item.goalId && !x.taskId)
        );
        item.worked = logsForTask.reduce(
          (acc: number, curr: any) => acc + curr.totalFocus,
          0
        );
        return item;
      });
    }
  }

  async function refreshv2() {
    isLoadingState = true;
    const response = await sessionStore.select(id);
    if (response && response.id) {
      log = response;
    }
    if (log.items) {
      goals = await new SearchStore(Resource.goal).select({
        filters: {
          id: log.items.map((x) => x.id)
        },
        isIncludeSubItems: true
      });
      tasks = await new SearchStore(Resource.task).select({
        filters: {
          id: log.items.map((x) => x.id)
        }
      });
    }
    isLoadingState = false;
  }
</script>

{#if log}
  <div class="flex flex-col gap-4 flex-grow w-full items-center p-4">
    {#if accessMode === ResourceAccessMode.SPLIT || accessMode === ResourceAccessMode.FSPLIT}
      <div class="flex gap-4 w-full justify-between">
        <Text content="Session details" style={TextStyle.PANEL_HEADING} />
      </div>
      <FullScreenCloseButton {accessMode} />
    {/if}
    <LogIntervalBar {log} />
    {#if isValidDataString(log?.plannedEnd) && !isSameDateTime( new Date(log.end), new Date(log.plannedEnd), { isIgnoreSeconds: true } ) && new Date(log.end).getTime() < new Date(log.plannedEnd).getTime()}
      <InlineInfoBanner>
        <span>
          This Session was planned to end at <b>
            {formatTime($userPreferences, new Date(log.plannedEnd))}</b
          >
          but was finished early at
          <b>{formatTime($userPreferences, new Date(log.end))}.</b>
        </span>
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
              {#if log.items.length > 0}
                {#each log.items as item (item.id)}
                  <FocusItem
                    focusItem={item}
                    {goals}
                    {tasks}
                    intervals={log.blocks}
                    contxt="history"
                  />
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
      action={PointronAction.SESSION_LOG_MODAL}
      primaryAction={{
        label: "Delete session",
        icon: "ph:trash-light",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          appStore.runAction(PointronAction.DELETE_SESSION, {
            componentParams: { id: log.id }
          });
        }
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

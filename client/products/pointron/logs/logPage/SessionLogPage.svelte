<script lang="ts">
  import Markdown from "@21n/components/markdown/Markdown.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import {
    isValidDataString,
    isValidMarkdown
  } from "@21n/shared-utils/text.utils";
  import { onMount } from "svelte";
  import LogIntervalBar from "@21n/products/pointron/logs/logPage/LogIntervalBar.svelte";
  import LogTotals from "@21n/products/pointron/logs/logPage/LogTotals.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import FocusItem from "@21n/products/pointron/focus/elements/focusitem/FocusItem.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import {
    formatDatetime,
    formatTime,
    isSameDateTime
  } from "@21n/utils/time.utils";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { sessionStore } from "@21n/products/pointron/focus/session.store";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import FullScreenCloseButton from "@21n/elements/button/FullScreenCloseButton.svelte";
  import { goalStore } from "@21n/components/goals/goal.store";
  import { taskStore } from "@21n/components/tasks/task.store";
  import view from "@21n/stores/view.store";
  import { SessionType } from "@21n/products/pointron/logs/log.type";
  import type { IFocusItem } from "@21n/types/pointron/session.type";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";

  export let id: string;
  export let log: any = undefined;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  let selectedTab: "Summary" | "Notes" = "Summary";
  let isLoadingState: boolean = false;
  let focusItems: IFocusItem[] = [];
  let goals: IGoalThumb[] = [];
  let tasks: ITaskThumb[] = [];

  async function refreshv2() {
    try {
      isLoadingState = true;
      const response = await sessionStore.select(id);
      if (response && response.id) {
        log = response;
        const tasksWithGoal = log.items
          ?.map((x: any) => x.tasks)
          ?.flat()
          ?.filter((x: any) => x);
        focusItems = log.items.filter(
          (x: any) => !tasksWithGoal.some(resourceInList(x))
        );
      }
      if (log.items) {
        goals = await goalStore.selectMany(
          {
            filters: {
              id: log.items.map((x: any) => x.id.toString())
            }
          },
          {
            isIncludeSubItems: true,
            isExpand: true
          }
        );
        tasks = await taskStore.selectMany(
          {
            filters: {
              id: log.items.map((x: any) => x.id.toString())
            }
          },
          {
            isExpand: true
          }
        );
      }
      isLoadingState = false;
    } catch (error) {
      logger.error({ at: "SessionLogPage", error });
    } finally {
      isLoadingState = false;
    }
  }
</script>

{#await refreshv2()}
  <EmptyStatusView
    {isLoadingState}
    mainText="Session log not found"
    loadingText="Loading..."
  />
{:then}
  <div
    class="flex flex-col gap-6 flex-grow w-full items-center userdata otop:pt-12"
  >
    <ModalContentPadded
      class="flex flex-col gap-6 flex-grow w-full items-center"
    >
      <div class="flex gap-4 w-full items-center justify-between">
        <Text content="Session details" style={TextStyle.PANEL_HEADING} />
        {#if accessMode === ResourceAccessMode.SPLIT || accessMode === ResourceAccessMode.FSPLIT || $view.isConstrainedWidth}
          <Button
            icon="cross"
            style={ButtonStyle.OUTLINED}
            tooltip="Close"
            on:click={() => appStore.closeResource({ accessMode })}
          />
        {/if}
      </div>
      <LogIntervalBar {log} />
      {#if log?.plannedEndUnix && !isSameDateTime( new Date(log.endUnix), new Date(log.plannedEndUnix), { isIgnoreSeconds: true } ) && new Date(log.endUnix).getTime() < new Date(log.plannedEndUnix).getTime()}
        <InlineInfoBanner>
          <span>
            This Session was planned to end at <b>
              {formatTime($userPreferences, new Date(log.plannedEndUnix))}</b
            >
            but was finished early at
            <b>{formatTime($userPreferences, new Date(log.endUnix))}.</b>
          </span>
        </InlineInfoBanner>
      {/if}
      {#if log.type === SessionType.MANUAL_ENTRY && log.modifiedAt}
        <span class="text-fgs2 text-b2">
          This session was created from a manual entry at
          <b>{formatDatetime($userPreferences, new Date(log.modifiedAt))}</b>
        </span>
      {/if}
      <div class="flex flex-col gap-6 w-full flex-grow items-center">
        <div>
          <PanelSwitcher
            items={["Summary", "Notes"]}
            style={PanelSwitcherStyle.TRAIN}
            bind:value={selectedTab}
            activeItemStrength={PanelSwitcherActiveItemStrength.SUBTLE}
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
                  {#each focusItems as item (item.id)}
                    <FocusItem
                      focusItem={item}
                      {goals}
                      {tasks}
                      focusItemsList={log.items}
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
    </ModalContentPadded>

    <ModalFooter
      action={Resource.session + "-resource"}
      primaryAction={{
        label: "Delete session",
        icon: "trash",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          appStore.runAction(PointronAction.DELETE_SESSION, {
            componentParams: { id: log.id }
          });
        }
      }}
      secondaryAction={{
        label: "Close",
        icon: "cross",
        callback: async () => appStore.closeResource({ accessMode })
      }}
    />
  </div>
{/await}

<script lang="ts">
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import { BarStyle, PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { cn } from "@21n/utils/ui.utils";
  import CalendarColumnTasksPanel from "@21n/components/calendar/column/CalendarColumnTasksPanel.svelte";
  import { CalendarColumnLayout } from "@21n/components/calendar/calendar.type";
  import DayTimeline from "@21n/components/calendar/column/timeline/daytimeline/DayTimeline.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import { createEventDispatcher } from "svelte";
  import ButtonGroup from "@21n/elements/button/ButtonGroup.svelte";
  import { Size } from "@21n/types/size.enum";
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import BoxButton from "@21n/elements/button/BoxButton.svelte";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  const dispatch = createEventDispatcher();
  export let date: Date;
  export let isExpandable: boolean = false;
  export let layout: CalendarColumnLayout;
  export let scale: TimeScaleUnit;
  let timelinePanelSubItem: "tasks" | "events" = resolveTimlinePanelSelection();
  let allDayPanelState: "default" | "collapsed" | "expanded" = "default";
  let isShowCompletedTasks: boolean = refreshShowCompletedTasksState();
  let completedTasksCount: number | undefined = undefined;
  let tasksPanelRef: CalendarColumnTasksPanel | undefined = undefined;
  $: timelinePanelSubItems = resolveTimelinePanelSubItems($appStore.product);

  function resolveTimlinePanelSelection() {
    const persistedValue = uiState.getState(
      UIState.calendarDayTimelinePanelSelection,
      {
        scope: UIStateScope.DEVICE
      }
    );
    const supportedValues = ["tasks", "events"];
    if (persistedValue && supportedValues.includes(persistedValue)) {
      return persistedValue;
    }
    return "tasks";
  }

  function refreshShowCompletedTasksState() {
    return (
      uiState.getState(UIState.showCompletedCalendarTasks, {
        scope: UIStateScope.DEVICE
      }) ?? false
    );
  }

  /**
   * TODO - tasks and events count badges
   * @param product
   */
  function resolveTimelinePanelSubItems(product: Product) {
    const events = {
      label: "Events",
      value: "events"
    };
    const tasks = {
      label: "Tasks",
      value: "tasks"
    };
    switch (product) {
      case Product.POINTRON:
        return [events, tasks];
      case Product.NUCLEUS:
        return [events, tasks];
      default:
        return [];
    }
  }

  function onTimelinePanelSwitch(e: CustomEvent<string>) {
    uiState.setState(UIState.calendarDayTimelinePanelSelection, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }

  function handleCreate() {
    if (timelinePanelSubItem === "tasks") {
      handleCreateTask();
    } else if (timelinePanelSubItem === "events") {
      handleCreateEvent();
    }
  }

  function handleCreateEvent() {
    appStore.runAction(
      resourceAction(Resource.event, ResourceActionType.CREATE),
      {
        componentParams: { date }
      }
    );
  }

  async function handleCreateTask() {
    appStore.runAction(
      resourceAction(Resource.task, ResourceActionType.CREATE),
      {
        componentParams: { date }
      }
    );
  }

  function onHideCompletedChange() {
    tasksPanelRef?.toggleCompletedTasks();
  }
</script>

<div
  class={cn("flex flex-col", {
    "flex-grow": isExpandable,
    "max-w-md border-l border-brs2": layout === CalendarColumnLayout.FULL,
    "lp:max-w-sm 2k:max-w-lg": layout === CalendarColumnLayout.SPLIT,
    "w-1/2 shrink-0": !isExpandable && layout !== CalendarColumnLayout.TABS,
    "w-full": !isExpandable && layout === CalendarColumnLayout.TABS
  })}
>
  {#if layout !== CalendarColumnLayout.TABS}
    <div class="flex justify-between gap-3 min-h-10 h-10 border-b border-brs2">
      {#if scale !== TimeScaleUnit.DAY}
        <div class="flex h-full gap-1">
          <div class="hover:bg-bgs2-striped">
            <DatePicker
              bind:date
              on:change={(e) => {
                dispatch("dateChange", e.detail);
              }}
              variant="inline-with-icon"
            />
          </div>
        </div>
      {:else}
        <span>
          <BoxButton
            width="w-fit px-3"
            icon="plus"
            label="Create"
            on:click={handleCreate}
          />
        </span>
      {/if}
      {#if timelinePanelSubItems.length > 1}
        <div>
          <BoxSwitcher
            options={timelinePanelSubItems}
            bind:selected={timelinePanelSubItem}
            on:select={onTimelinePanelSwitch}
          />
        </div>
      {/if}
    </div>
  {/if}
  <div class="flex flex-col flex-grow">
    <div
      class={cn(
        "flex flex-col w-full border-b transition-all",
        {
          "min-h-full h-full border-transparent":
            layout === CalendarColumnLayout.FULL ||
            allDayPanelState === "expanded"
        },
        layout !== CalendarColumnLayout.FULL && {
          "min-h-[45vh] h-[45vh]": allDayPanelState === "default",
          "min-h-fit h-fit": allDayPanelState === "collapsed",
          "border-brs2": allDayPanelState !== "expanded"
        }
      )}
    >
      {#if allDayPanelState !== "collapsed" && timelinePanelSubItems.length > 0 && layout === CalendarColumnLayout.TABS}
        <div class="flex justify-center pb-1">
          <PanelSwitcher
            items={timelinePanelSubItems}
            bind:value={timelinePanelSubItem}
            style={PanelSwitcherStyle.BAR}
            barStyle={BarStyle.DOT}
            isExpandToFullWidth={layout === CalendarColumnLayout.TABS}
            on:switch={onTimelinePanelSwitch}
          >
            <div slot="right" class="flex items-center gap-2 mr-3">
              {#if timelinePanelSubItem === "tasks"}
                <Toggle
                  icon={isShowCompletedTasks ? "hide" : "show"}
                  tooltip={`${isShowCompletedTasks ? "Hide" : "Show"} completed (${completedTasksCount})`}
                  bgSize={Size.sm}
                  count={completedTasksCount}
                  on={isShowCompletedTasks}
                  on:change={onHideCompletedChange}
                />
              {/if}
              <Button
                icon="plus"
                tooltip="Create new"
                on:click={handleCreate}
              />
            </div>
          </PanelSwitcher>
        </div>
      {/if}
      {#if allDayPanelState !== "collapsed"}
        <div class="overflow-y-auto w-full min-h-0 flex-1 px-3">
          {#if timelinePanelSubItem === "tasks"}
            <CalendarColumnTasksPanel
              {date}
              bind:this={tasksPanelRef}
              bind:isShowCompletedTasks
              bind:completedTasksCount
            />
          {:else if timelinePanelSubItem === "events"}
            <EmptyStatusView mainText="Coming soon..." size={Size.sm} />
          {/if}
        </div>
      {/if}
      <div
        class={cn("w-full h-8 flex", {
          "justify-end pt-1": allDayPanelState !== "collapsed",
          "justify-between": allDayPanelState === "collapsed"
        })}
      >
        {#if allDayPanelState === "collapsed"}
          <!-- TODO: Counts -->
          <div class="text-fgs3 px-1 flex h-full items-center">
            Tasks & Events
          </div>
        {/if}
        {#if layout !== CalendarColumnLayout.FULL}
          <div class="h-full w-fit">
            <ButtonGroup
              width="w-10"
              buttons={[
                ...(allDayPanelState === "default" ||
                allDayPanelState === "collapsed"
                  ? [
                      {
                        size: Size.sm,
                        icon: "chevron-down",
                        tooltip: "Expand",
                        callback: async () => {
                          if (allDayPanelState === "default")
                            allDayPanelState = "expanded";
                          else if (allDayPanelState === "collapsed")
                            allDayPanelState = "default";
                        }
                      }
                    ]
                  : []),
                ...(allDayPanelState === "default" ||
                allDayPanelState === "expanded"
                  ? [
                      {
                        size: Size.sm,
                        icon: "chevron-up",
                        tooltip: "Collapse",
                        callback: async () => {
                          if (allDayPanelState === "default")
                            allDayPanelState = "collapsed";
                          else if (allDayPanelState === "expanded")
                            allDayPanelState = "default";
                        }
                      }
                    ]
                  : []),
                ...(allDayPanelState === "collapsed" ||
                allDayPanelState === "expanded"
                  ? [
                      {
                        size: Size.sm,
                        icon:
                          allDayPanelState === "collapsed"
                            ? "ph:caret-double-down"
                            : "ph:caret-double-up",
                        tooltip:
                          allDayPanelState === "collapsed"
                            ? "Expand fully"
                            : "Collapse fully",
                        callback: async () => {
                          if (allDayPanelState === "collapsed")
                            allDayPanelState = "expanded";
                          else if (allDayPanelState === "expanded")
                            allDayPanelState = "collapsed";
                        }
                      }
                    ]
                  : [])
              ]}
            />
          </div>
        {/if}
      </div>
    </div>
    {#if layout !== CalendarColumnLayout.FULL}
      <div class="flex flex-col flex-grow">
        <DayTimeline {date} {layout} />
      </div>
    {/if}
  </div>
</div>

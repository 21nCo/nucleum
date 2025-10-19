<script lang="ts">
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import { cn } from "@21n/utils/ui.utils";
  import CalendarColumnTasksPanel from "@21n/components/calendar/column/CalendarColumnTasksPanel.svelte";
  import {
    CalendarColumnLayout,
    type CalendarTimelineEntry
  } from "@21n/components/calendar/calendar.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { sessionStore } from "@21n/products/pointron/focus/session.store";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { ISessionThumb } from "@21n/products/pointron/logs/log.type";
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";
  import DayTimeline from "@21n/components/calendar/column/timeline/daytimeline/DayTimeline.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { Action } from "@21n/types/action.enum";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let date: Date;
  export let isExpandable: boolean = false;
  export let layout: CalendarColumnLayout;
  let timelinePanelSubItem: string = resolveTimlinePanelSelection();
  let isRefreshing: boolean = false;
  let timelineEntries: CalendarTimelineEntry[] = [];
  $: timelinePanelSubItems = resolveTimelinePanelSubItems($appStore.product);
  $: dateString = date.toISOString().split("T")[0];
  $: if (dateString) refreshTimelineEntries();

  function resolveTimlinePanelSelection() {
    return (
      uiState.getState(UIState.calendarDayTimelinePanelSelection, {
        scope: UIStateScope.DEVICE
      }) ?? "timeline"
    );
  }

  /**
   * TODO - tasks and events count badges
   * @param product
   */
  function resolveTimelinePanelSubItems(product: Product) {
    const timeline = {
      label: "Timeline",
      value: "timeline"
    };
    const allDay = {
      label: "All day",
      value: "allday"
    };
    const tasks = {
      label: "Tasks",
      value: "tasks"
    };
    switch (product) {
      case Product.POINTRON:
        return [timeline, tasks];
      case Product.NUCLEUS:
        return [timeline, tasks];
      case Product.MEMOTRON:
        return [timeline];
      default:
        return [timeline];
    }
  }

  async function refreshTimelineEntries() {
    isRefreshing = true;
    const focusEntries = await refreshFocusEntries();
    if (isValidArrayWithData(focusEntries)) {
      timelineEntries = [...focusEntries];
    }
    isRefreshing = false;
  }

  async function refreshFocusEntries() {
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
      return result.map((session: ISessionThumb) => ({
        startUnix: session.startUnix,
        endUnix: session.endUnix,
        component: "focusTimelineEntry",
        item: {
          ...session,
          splits: resolveSessionTimeSplit(session)
        }
      }));
    }
  }

  function onTimelinePanelSwitch(e: CustomEvent<string>) {
    uiState.setState(UIState.calendarDayTimelinePanelSelection, e.detail, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div
  class={cn("flex flex-col", {
    "flex-grow": isExpandable,
    "max-w-2xl": layout === CalendarColumnLayout.FULL,
    "lp:max-w-sm 2k:max-w-lg": layout === CalendarColumnLayout.SPLIT,
    "w-1/2 shrink-0": !isExpandable && layout !== CalendarColumnLayout.TABS,
    "w-full": !isExpandable && layout === CalendarColumnLayout.TABS
  })}
>
  {#if layout !== CalendarColumnLayout.TABS}
    <div class="flex justify-between gap-3 py-2">
      <div>
        <DatePicker
          bind:date
          on:change={(e) => {
            dispatch("dateChange", e.detail);
          }}
          variant="inline"
        />
      </div>
      <Button
        icon="history"
        tooltip="History"
        on:click={() => {
          appStore.openResource(Action.HISTORY, ResourceAccessMode.POP, {
            searchParams: { [AppSearchParam.DATE]: date.toISOString() }
          });
        }}
      />
    </div>
  {/if}
  {#if timelinePanelSubItems.length > 0}
    <div class="flex justify-center pb-2">
      <PanelSwitcher
        items={timelinePanelSubItems}
        bind:value={timelinePanelSubItem}
        style={PanelSwitcherStyle.BAR}
        barStyle={BarStyle.DOT}
        isExpandToFullWidth={layout === CalendarColumnLayout.TABS}
        on:switch={onTimelinePanelSwitch}
      >
        <div slot="right">
          {#if layout === CalendarColumnLayout.TABS}
            <Button
              icon="history"
              tooltip="History"
              on:click={() => {
                appStore.openResource(Action.HISTORY, ResourceAccessMode.POP, {
                  searchParams: { [AppSearchParam.DATE]: date.toISOString() }
                });
              }}
            />
          {/if}
        </div>
      </PanelSwitcher>
    </div>
  {/if}
  {#if timelinePanelSubItem === "tasks"}
    <CalendarColumnTasksPanel {date} />
  {:else if timelinePanelSubItem === "allday"}
    <!-- render both tasks, events on top of each other -->
  {:else if timelinePanelSubItem === "timeline"}
    <div class="flex flex-col flex-grow">
      <DayTimeline {date} data={timelineEntries} {isRefreshing} {layout} />
    </div>
  {/if}
</div>

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  on:change={refreshTimelineEntries}
/>

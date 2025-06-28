<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import { Size } from "$lib/client/types/size.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import CalendarColumnTasksPanel from "../CalendarColumnTasksPanel.svelte";
  import {
    CalendarColumnLayout,
    type CalendarTimelineEntry
  } from "../../calendar.type";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { ISessionThumb } from "$lib/client/products/pointron/logs/log.type";
  import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
  import DayTimeline from "./daytimeline/DayTimeline.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

  export let date: Date;
  export let isExpandable: boolean = false;
  export let layout: CalendarColumnLayout;
  let switcherSize: Size.md | Size.lg =
    layout === CalendarColumnLayout.TABS ? Size.md : Size.lg;
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
  class={cn("flex flex-col gap-3", {
    "flex-grow": isExpandable,
    "w-1/2 max-w-2xl shrink-0":
      !isExpandable && layout !== CalendarColumnLayout.TABS,
    "w-full": !isExpandable && layout === CalendarColumnLayout.TABS
  })}
>
  {#if timelinePanelSubItems.length > 0}
    <PanelSwitcher
      items={timelinePanelSubItems}
      bind:value={timelinePanelSubItem}
      style={PanelSwitcherStyle.BAR}
      barStyle={BarStyle.DOT}
      size={switcherSize}
      isExpandToFullWidth={true}
      on:switch={onTimelinePanelSwitch}
    >
      <div slot="right">
        <Button
          icon="ph:clock-counter-clockwise-light"
          tooltip="History"
          on:click={() => {
            appStore.openResource(Action.HISTORY, ResourceAccessMode.POP, {
              searchParams: { [AppSearchParam.DATE]: date.toISOString() }
            });
          }}
        />
      </div>
    </PanelSwitcher>
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

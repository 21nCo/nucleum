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
  import { resolveTimePeriodFilterForDay } from "$lib/client/elements/datetime/datetime.utils";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { ISessionThumb } from "$lib/client/products/pointron/logs/log.type";
  import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
  import DayTimeline from "./daytimeline/DayTimeline.svelte";

  export let date: Date;
  export let isExpandable: boolean = false;
  export let layout: CalendarColumnLayout;
  let switcherSize: Size.md | Size.lg =
    layout === CalendarColumnLayout.TABS ? Size.md : Size.lg;
  let timelinePanelSubItem: string = "timeline";
  let isRefreshing: boolean = false;
  let timelineEntries: CalendarTimelineEntry[] = [];
  $: timelinePanelSubItems = resolveTimelinePanelSubItems($appStore.product);
  $: dateString = date.toISOString().split("T")[0];
  $: if (dateString) refreshTimelineEntries();

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
        return [timeline, allDay];
      case Product.MEMOTRON:
        return [];
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
    const dayFilter = resolveTimePeriodFilterForDay(date);
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
    />
  {/if}
  {#if timelinePanelSubItem === "tasks"}
    <CalendarColumnTasksPanel {date} />
  {:else if timelinePanelSubItem === "allday"}
    <!-- render both tasks, events on top of each other -->
  {:else if timelinePanelSubItem === "timeline"}
    <div class="flex flex-col flex-grow">
      <DayTimeline {date} data={timelineEntries} />
    </div>
  {/if}
</div>

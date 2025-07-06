<script lang="ts">
  import CalendarHeader from "./CalendarHeader.svelte";
  import MonthView from "./MonthView.svelte";
  import WeekView from "./WeekView.svelte";
  import YearView from "./YearView.svelte";
  import CalendarLayoutView from "../CalendarLayout.svelte";
  import view from "$lib/client/stores/view.store";
  import CalendarColumn from "../column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import {
    CalendarLayout,
    type ICalendarIndicatorData
  } from "../calendar.type";
  import { resizable } from "$lib/client/actions/resize.action";
  import { debouncer } from "$lib/client/utils/utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    MetaResource,
    Resource
  } from "../../flux/resourceStores/resource.enum";
  import { SearchStore } from "../../record/record.store";
  import { compareObjects } from "$lib/shared/utils/obj.utils";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import { NodeMetaType } from "$lib/client/products/memotron/node/node.type";
  import { cache } from "$lib/client/layout/layers/cache/cache.store";
  import { CacheKey } from "$lib/client/layout/layers/cache/cache.type";
  import MemotronTempCalendarColumn from "../column/MemotronTempCalendarColumn.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import ClassicCalendarHeaderLeftOptions from "./ClassicCalendarHeaderLeftOptions.svelte";
  import { onMount } from "svelte";
  import { Display } from "$lib/client/types/view.type";
  export let panel: CalendarLayout = CalendarLayout.Classic;

  let selectedDate = new Date();
  let selectedView: TimeScaleUnit = resolveSavedScaleSelection();
  let events: any[] = [];
  let yearViewRef: YearView;
  let weekViewRef: WeekView;
  let visibleWeekDates: Date[] | undefined;
  let width = resolveSavedWidthSelection(selectedView);
  let indicatorData: ICalendarIndicatorData[] = [];
  let indicatorRefreshId: number = new Date().getTime();
  let currentDateFilterForIndicatorData: any = {};
  let isRefreshing = false;

  onMount(() => {
    setTimeout(() => {
      refreshIndicatorData(selectedDate);
    }, 500);
  });

  function resolveSavedScaleSelection() {
    if ($appStore.product === Product.MEMOTRON) return TimeScaleUnit.YEAR;
    const scaleState = uiState.getState(UIState.classicCalendarScale, {
      scope: UIStateScope.DAP
    });
    return scaleState ?? TimeScaleUnit.YEAR;
  }

  function resolveSavedWidthSelection(view: TimeScaleUnit) {
    const widthState = uiState.getState(UIState.classicCalendarColumnWidth, {
      scope: UIStateScope.DAP,
      subVariables: [view.toString()]
    });
    return widthState ?? 450;
  }

  function handleYearChange(event: CustomEvent) {
    if (!event.detail) return;
    setDate(
      new Date(
        event.detail.year,
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
    );
  }

  function handleMonthChange(event: CustomEvent) {
    if (!event.detail) return;
    setDate(event.detail);
  }

  function handleVisibleDatesChange(event: CustomEvent) {
    visibleWeekDates = event.detail.dates;
  }

  function onResize(e: any) {
    width = e.width;
    debouncedResizePersist(width);
  }

  const debouncedResizePersist = debouncer((width: number) => {
    uiState.setState(UIState.classicCalendarColumnWidth, width, {
      scope: UIStateScope.DAP,
      subVariables: [selectedView.toString()]
    });
  }, 1000);

  function resolveResourcesForIndicators(): (Resource | MetaResource)[] {
    const product = $appStore.product;
    switch (product) {
      case Product.POINTRON:
        return [Resource.task, Resource.session];
      case Product.MEMOTRON:
        return [Resource.node, MetaResource.calendarNotes];
      case Product.NUCLEUS:
        return [
          Resource.task,
          Resource.session,
          Resource.node,
          MetaResource.calendarNotes
        ];
      default:
        return [];
    }
  }

  async function refreshIndicatorData(
    date: Date,
    resource?: (Resource | MetaResource)[]
  ) {
    if (selectedView === TimeScaleUnit.DAY) return;
    console.time("refreshIndicatorData");
    const resourcesForIndicators = resolveResourcesForIndicators();
    if (resourcesForIndicators.length === 0) return;
    const filteredResourcesForIndicators = resource
      ? resourcesForIndicators.filter((r) => resource.includes(r))
      : resourcesForIndicators;
    if (filteredResourcesForIndicators.length === 0) return;
    const dateFilter: any =
      selectedView === TimeScaleUnit.MONTH
        ? tzStore.resolveTimePeriodFilterForMonth(date)
        : selectedView === TimeScaleUnit.YEAR
          ? tzStore.resolveTimePeriodFilterForYear(date)
          : {};
    if (
      compareObjects(currentDateFilterForIndicatorData, dateFilter) &&
      (!resource || resource.length === 0)
    ) {
      return;
    }
    const cachedData = cache.retrieve(CacheKey.CALENDAR_CACHE);
    const dateFilterCached = cachedData?.[selectedView]?.dateFilter;
    if (dateFilterCached && compareObjects(dateFilterCached, dateFilter)) {
      indicatorData = cachedData[selectedView].indicatorData;
    } else {
      indicatorData = [];
      isRefreshing = true;
    }
    currentDateFilterForIndicatorData = dateFilter;
    const promises = filteredResourcesForIndicators.map((resource) => {
      let filters: any = {};
      let properties: string[] = [
        "id",
        "modifiedAt",
        "trashInformation",
        "isArchived"
      ];
      if (resource === Resource.task) {
        properties.push("dateUnix");
        filters = {
          dateUnix: dateFilter
        };
      } else if (resource === Resource.session) {
        properties.push("startUnix", "blocks", "start");
        filters = {
          startUnix: dateFilter
        };
      } else if (resource === Resource.node) {
        properties.push("createdAt");
        filters = {
          createdAt: {
            type: "date",
            greaterThanOrEqual: new Date(
              dateFilter.greaterThanOrEqual
            ).toISOString(),
            lessThanOrEqual: new Date(dateFilter.lessThanOrEqual).toISOString()
          }
        };
      } else if (resource === MetaResource.calendarNotes) {
        properties.push("metaType", "date", "text");
        filters = {
          metaType: NodeMetaType.CALENDAR_NOTES,
          date: {
            type: "date",
            greaterThanOrEqual: new Date(
              dateFilter.greaterThanOrEqual
            ).toISOString(),
            lessThanOrEqual: new Date(dateFilter.lessThanOrEqual).toISOString()
          }
        };
      }
      const searchResource =
        resource === MetaResource.calendarNotes
          ? Resource.node
          : (resource as Resource);
      return new SearchStore(searchResource).select({
        properties,
        filters,
        isExpand: false,
        isIncludeMetaItems: resource === MetaResource.calendarNotes
      });
    });
    const results = await Promise.all(promises);
    results.forEach((result, index) => {
      const resource = filteredResourcesForIndicators[index];
      indicatorData = indicatorData.filter((x) => x.resource !== resource);
      indicatorData.push({
        resource,
        data: result,
        color: resolveColor(resource)
      });
    });
    indicatorRefreshId = new Date().getTime();
    console.timeEnd("refreshIndicatorData");
    cache.replaceUsingSubKey(CacheKey.CALENDAR_CACHE, selectedView, {
      dateFilter,
      indicatorData
    });
    isRefreshing = false;
  }

  function resolveColor(resource: Resource | MetaResource) {
    switch (resource) {
      case Resource.task:
        return "fgs4";
      case Resource.sessionLog:
      case Resource.session:
        return "aps1";
      case Resource.node:
      case MetaResource.calendarNotes:
        return "aps1";
    }
  }

  function handleScaleSelection(event: CustomEvent) {
    selectedView = event.detail;
    width = resolveSavedWidthSelection(selectedView);
  }

  function setDate(date: Date) {
    selectedDate = date;
    onDateChange();
  }

  function onDateChange() {
    refreshIndicatorData(selectedDate);
  }
</script>

<CalendarLayoutView
  bind:panel
  on:goToToday={() => {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      if (selectedView === TimeScaleUnit.YEAR) {
        yearViewRef?.scrollToToday();
      } else if (selectedView === TimeScaleUnit.WEEK) {
        weekViewRef?.scrollToToday();
      }
      selectedDate = new Date();
    } else {
      selectedDate = new Date();
      onDateChange();
    }
  }}
>
  <slot name="header-left-options" slot="header-left-options">
    <ClassicCalendarHeaderLeftOptions
      bind:selectedView
      {isRefreshing}
      on:scaleSelection={handleScaleSelection}
    />
  </slot>
  <slot name="header" slot="header">
    <CalendarHeader
      bind:selectedDate
      bind:selectedView
      {visibleWeekDates}
      on:dateChange={onDateChange}
      on:goToPrevious={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigatePrevYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToPrevWeek();
        }
      }}
      on:goToNext={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigateNextYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToNextWeek();
        }
      }}
    />
  </slot>

  <div class="flex h-full">
    <!-- <CalendarSidebar {events} /> -->
    <div class="flex-1 overflow-auto">
      {#if selectedView === TimeScaleUnit.MONTH}
        <MonthView
          bind:selectedDate
          {indicatorData}
          {indicatorRefreshId}
          on:monthChange={handleMonthChange}
          on:dateChange={onDateChange}
        />
      {:else if selectedView === TimeScaleUnit.WEEK}
        <WeekView
          bind:this={weekViewRef}
          {selectedDate}
          {events}
          on:monthChange={handleMonthChange}
          on:visibleDatesChange={handleVisibleDatesChange}
        />
      {:else if selectedView === TimeScaleUnit.YEAR}
        <YearView
          bind:this={yearViewRef}
          bind:selectedDate
          {indicatorData}
          {indicatorRefreshId}
          on:yearChange={handleYearChange}
          on:dateChange={onDateChange}
        />
      {/if}
    </div>
    {#if (selectedView !== TimeScaleUnit.WEEK && !$view.isConstrainedWidth) || selectedView === TimeScaleUnit.DAY}
      <div
        class={cn("relative border-l border-brs3", {
          "w-[28rem]": selectedView !== TimeScaleUnit.DAY,
          "w-full": selectedView === TimeScaleUnit.DAY
        })}
        style={selectedView !== TimeScaleUnit.DAY
          ? `min-width: ${width}px; width: ${width}px; max-width: ${width}px;`
          : ""}
        use:resizable={{
          // enabled: !$context.isTouchDevice,
          enabled:
            selectedView === TimeScaleUnit.MONTH ||
            selectedView === TimeScaleUnit.YEAR,
          minWidth: 430,
          maxWidth: $view.display === Display.TK ? 1400 : 1000,
          edges: ["left"],
          onResize: onResize
        }}
      >
        {#key selectedDate.toISOString()}
          {#if $appStore.product === Product.MEMOTRON}
            <MemotronTempCalendarColumn date={selectedDate} />
          {:else}
            <CalendarColumn
              scale={TimeScaleUnit.DAY}
              date={selectedDate}
              on:dateChange={(e) => {
                if (e.detail) {
                  if (selectedView === TimeScaleUnit.YEAR) {
                    yearViewRef?.scrollToDate(e.detail);
                  } else if (selectedView === TimeScaleUnit.MONTH) {
                    setDate(e.detail);
                  } else if (selectedView === TimeScaleUnit.WEEK) {
                    //TODO
                    // weekViewRef?.scrollToToday();
                  }
                }
              }}
            />
          {/if}
        {/key}
      </div>
    {/if}
  </div>
</CalendarLayoutView>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.task])}
  on:change={() => {
    setTimeout(() => {
      refreshIndicatorData(selectedDate, [Resource.task]);
    }, 500);
  }}
/>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  on:change={() => {
    setTimeout(() => {
      refreshIndicatorData(selectedDate, [Resource.session]);
    }, 500);
  }}
/>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.node])}
  on:change={() => {
    setTimeout(() => {
      refreshIndicatorData(selectedDate, [
        Resource.node,
        MetaResource.calendarNotes
      ]);
    }, 500);
  }}
/>

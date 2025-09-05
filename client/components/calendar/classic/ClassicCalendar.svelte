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
  import { Product } from "$lib/client/products/product.type";
  import { NodeMetaType } from "$lib/client/products/memotron/node/node.type";
  import { cache } from "$lib/client/layout/layers/cache/cache.store";
  import { CacheKey } from "$lib/client/layout/layers/cache/cache.type";
  import MemotronTempCalendarColumn from "../column/MemotronTempCalendarColumn.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import ClassicCalendarHeaderLeftOptions from "./ClassicCalendarHeaderLeftOptions.svelte";
  import { onMount } from "svelte";
  import { Display } from "$lib/client/types/view.type";
  import { logger } from "../../debug/logger.client";
  import { RemovalProperty } from "$lib/client/types/data.type";
  import YearViewV2 from "./YearViewV2.svelte";
  export let panel: CalendarLayout = CalendarLayout.Classic;

  let selectedDate = new Date();
  let selectedView: TimeScaleUnit = resolveSavedScaleSelection();
  let events: any[] = [];
  let yearViewRef: YearViewV2;
  let weekViewRef: WeekView;
  let visibleWeekDates: Date[] | undefined;
  let width = resolveSavedWidthSelection(selectedView);
  let indicatorData: ICalendarIndicatorData[] = [];
  let indicatorRefreshId: number = new Date().getTime();
  let currentDateFilterForIndicatorData: any = {};
  let isRefreshing = false;

  onMount(() => {
    refreshIndicatorDataWithDelay();
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
    const defaultVal = $appStore.product === Product.MEMOTRON ? 650 : 450;
    return widthState ?? defaultVal;
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

  function refreshIndicatorDataWithDelay(
    resource?: (Resource | MetaResource)[]
  ) {
    setTimeout(() => {
      refreshIndicatorData(selectedDate, resource);
    }, 500);
  }

  let isRefreshOperationInProgress = false;
  async function refreshIndicatorData(
    date: Date,
    resource?: (Resource | MetaResource)[]
  ) {
    try {
      if (selectedView === TimeScaleUnit.DAY || isRefreshOperationInProgress)
        return;
      console.time("refreshIndicatorData");
      isRefreshOperationInProgress = true;
      const resourcesForIndicators = resolveResourcesForIndicators();
      if (resourcesForIndicators.length === 0) return;
      const filteredResourcesForIndicators = resource
        ? resourcesForIndicators.filter((r) => resource.includes(r))
        : resourcesForIndicators;
      if (filteredResourcesForIndicators.length === 0) return;
      const dateFilter = tzStore.resolveTimePeriodFilter(date, {
        scale: selectedView
      });
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
              greaterThanOrEqual: new Date(dateFilter.greaterThanOrEqual),
              lessThanOrEqual: new Date(dateFilter.lessThanOrEqual)
            }
          };
        } else if (resource === MetaResource.calendarNotes) {
          properties.push("metaType", "date", "text");
          filters = {
            metaType: NodeMetaType.CALENDAR_NOTES,
            date: {
              greaterThanOrEqual: new Date(dateFilter.greaterThanOrEqual),
              lessThanOrEqual: new Date(dateFilter.lessThanOrEqual)
            }
          };
        }
        const searchResource =
          resource === MetaResource.calendarNotes
            ? Resource.node
            : (resource as Resource);
        return new SearchStore(searchResource).select({
          properties: {
            select: properties
          },
          filters,
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
    } catch (error) {
      logger.error("refreshIndicatorData", error);
    } finally {
      isRefreshOperationInProgress = false;
    }
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
    refreshIndicatorDataWithDelay();
  }

  function setDate(date: Date) {
    selectedDate = date;
    onDateChange();
  }

  function onDateChange() {
    refreshIndicatorDataWithDelay();
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
        <YearViewV2
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
  subscriptionPropsForMergeAction={[
    RemovalProperty.IS_ARCHIVED,
    RemovalProperty.TRASH_INFORMATION,
    "dateUnix",
    "isChecked"
  ]}
  on:change={() => {
    refreshIndicatorDataWithDelay([Resource.task]);
  }}
/>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  on:change={() => {
    refreshIndicatorDataWithDelay([Resource.session]);
  }}
/>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.node])}
  subscriptionPropsForMergeAction={[
    RemovalProperty.IS_ARCHIVED,
    RemovalProperty.TRASH_INFORMATION,
    "text"
  ]}
  on:change={() => {
    refreshIndicatorDataWithDelay([Resource.node, MetaResource.calendarNotes]);
  }}
/>

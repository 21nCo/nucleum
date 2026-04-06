<script lang="ts">
  import CalendarHeader from "@21n/components/calendar/classic/CalendarHeader.svelte";
  import MonthView from "@21n/components/calendar/classic/MonthView.svelte";
  import WeekView from "@21n/components/calendar/classic/WeekView.svelte";
  import CalendarLayoutView from "@21n/components/calendar/CalendarLayout.svelte";
  import view from "@21n/stores/view.store";
  import CalendarColumn from "@21n/components/calendar/column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import {
    CalendarLayout,
    type ICalendarIndicatorData
  } from "@21n/components/calendar/calendar.type";
  import { resizable } from "@21n/actions/resize.action";
  import { debouncer } from "@21n/utils/utils";
  import { cn } from "@21n/utils/ui.utils";
  import {
    MetaResource,
    Resource
  } from "@21n/components/flux/resourceStores/resource.enum";
  import { SearchStore } from "@21n/components/record/record.store";
  import { compareObjects } from "@21n/shared-utils/obj.utils";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import { NodeMetaType } from "@21n/products/memotron/node/node.type";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import MemotronTempCalendarColumn from "@21n/components/calendar/column/MemotronTempCalendarColumn.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import ClassicCalendarHeaderLeftOptions from "@21n/components/calendar/classic/ClassicCalendarHeaderLeftOptions.svelte";
  import { onMount } from "svelte";
  import { Display } from "@21n/types/view.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { RemovalProperty } from "@21n/types/data.type";
  import YearViewV2 from "@21n/components/calendar/classic/YearViewV2.svelte";
  let {
    panel = $bindable(CalendarLayout.Classic)
  }: {
    panel?: CalendarLayout;
  } = $props();

  let selectedDate = $state(new Date());
  let selectedView = $state<TimeScaleUnit>(resolveSavedScaleSelection());
  let selectedScale = $state<TimeScaleUnit>(TimeScaleUnit.DAY);
  let events = $state<any[]>([]);
  let yearViewRef: YearViewV2;
  let weekViewRef: WeekView;
  let visibleWeekDates = $state<Date[] | undefined>(undefined);
  let width = $state(resolveSavedWidthSelection(selectedView));
  let indicatorData = $state<ICalendarIndicatorData[]>([]);
  let indicatorRefreshId = $state<number>(new Date().getTime());
  let currentDateFilterForIndicatorData: any = {};
  let isRefreshing = $state(false);
  let yearViewRefreshId = $state(new Date().getTime());

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

  function handleYearChange(payload?: { year: number }) {
    if (!payload) return;
    setDate(
      new Date(
        payload.year,
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
    );
  }

  function handleMonthChange(date?: Date) {
    if (!date) return;
    setDate(date);
  }

  function handleMonthSelect(payload?: { date: Date }) {
    if (!payload || $appStore.product === Product.POINTRON) return;
    selectedScale = TimeScaleUnit.MONTH;
    setDate(payload.date);
  }

  function handleYearSelect(payload?: { date: Date }) {
    if (!payload || $appStore.product === Product.POINTRON) return;
    selectedScale = TimeScaleUnit.YEAR;
    setDate(payload.date);
  }

  function handleWeekSelect(payload?: { date: Date }) {
    if (!payload || $appStore.product === Product.POINTRON) return;
    selectedScale = TimeScaleUnit.WEEK;
    setDate(payload.date);
  }

  function handleVisibleDatesChange(payload?: { dates: Date[] }) {
    visibleWeekDates = payload?.dates;
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

  function onWindowResize() {
    if (selectedView !== TimeScaleUnit.YEAR) return;
    debouncedYearViewRefresh();
  }
  const debouncedYearViewRefresh = debouncer(() => {
    yearViewRefreshId = new Date().getTime();
  }, 500);
</script>

<CalendarLayoutView
  bind:panel
  onGoToToday={() => {
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
  {#snippet headerLeftOptions()}
    <ClassicCalendarHeaderLeftOptions
      bind:selectedView
      {isRefreshing}
      onScaleSelection={handleScaleSelection}
    />
  {/snippet}
  {#snippet header()}
    <CalendarHeader
      bind:selectedDate
      bind:selectedView
      {visibleWeekDates}
      onDateChange={onDateChange}
      onGoToPrevious={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigatePrevYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToPrevWeek();
        }
      }}
      onGoToNext={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigateNextYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToNextWeek();
        }
      }}
    />
  {/snippet}

  <div class="flex h-full">
    <!-- <CalendarSidebar {events} /> -->
    <div
      class={cn("flex-1 overflow-auto", {
        "min-w-60": selectedView !== TimeScaleUnit.DAY
      })}
    >
      {#if selectedView === TimeScaleUnit.MONTH}
        <MonthView
          bind:selectedDate
          {selectedScale}
          {indicatorData}
          {indicatorRefreshId}
          onMonthChange={handleMonthChange}
          onDateChange={() => {
            selectedScale = TimeScaleUnit.DAY;
            onDateChange();
          }}
          onWeekSelect={handleWeekSelect}
        />
      {:else if selectedView === TimeScaleUnit.YEAR}
        {#key yearViewRefreshId}
          <YearViewV2
            bind:this={yearViewRef}
            bind:selectedDate
            {selectedScale}
            {indicatorData}
            {indicatorRefreshId}
            onYearChange={handleYearChange}
            onDateChange={() => {
              selectedScale = TimeScaleUnit.DAY;
              onDateChange();
            }}
            onMonthSelect={handleMonthSelect}
            onYearSelect={handleYearSelect}
          />
        {/key}
      {/if}
    </div>
    {#if (selectedView !== TimeScaleUnit.WEEK && !$view.isConstrainedWidth) || selectedView === TimeScaleUnit.DAY}
      <div
        class={cn("relative", {
          "w-[28rem] border-l border-brs3": selectedView !== TimeScaleUnit.DAY,
          "w-full": selectedView === TimeScaleUnit.DAY
        })}
        style={selectedView !== TimeScaleUnit.DAY &&
        $view.display !== Display.TP
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
          {#if $appStore.product === Product.MEMOTRON || (selectedScale !== TimeScaleUnit.DAY && $appStore.product === Product.NUCLEUS)}
            <MemotronTempCalendarColumn
              date={selectedDate}
              scale={selectedScale}
            />
          {:else}
            <CalendarColumn
              scale={selectedScale}
              viewScale={selectedView}
              date={selectedDate}
              onDateChange={(e) => {
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
  onChange={() => {
    refreshIndicatorDataWithDelay([Resource.task]);
  }}
/>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  onChange={() => {
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
  onChange={() => {
    refreshIndicatorDataWithDelay([Resource.node, MetaResource.calendarNotes]);
  }}
/>
<svelte:window onresize={onWindowResize} />

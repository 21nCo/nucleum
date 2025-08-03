<script lang="ts">
  import { resizeListener } from "$lib/client/actions/resize.action";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { Product } from "$lib/client/products/product.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import {
    CalendarColumnLayout,
    CalendarColumnPanel,
    CalendarExpansionMode
  } from "../calendar.type";
  import CalendarColumnPanelResolver from "./CalendarColumnPanelResolver.svelte";
  import CalendarColumnPanelSelector from "./CalendarColumnPanelSelector.svelte";
  import CalendarColumnTimeline from "./timeline/CalendarColumnTimeline.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { page } from "$app/stores";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();

  export let scale: TimeScaleUnit;
  export let date: Date;
  export let expansionMode: CalendarExpansionMode =
    CalendarExpansionMode.JOURNAL;
  export let isRewind: boolean = false;
  export let isCwContext: boolean = false;
  let mdId = generateSimpleRandomId();
  const backPath = $page.url.searchParams.get("back");

  let selectedPanel: CalendarColumnPanel = resolvePanelSelection();

  function resolvePanelSelection() {
    const panelState = uiState.getState(UIState.calendarColumnPanel, {
      scope: UIStateScope.DEVICE
    });
    return (
      panelState ??
      ($appStore.product === Product.MEMOTRON
        ? CalendarColumnPanel.Notes
        : CalendarColumnPanel.Timeline)
    );
  }

  let containerWidth = 0;

  $: layout = resolveLayout(containerWidth);

  $: panels = resolvePanels($appStore.product, layout);

  function resolveLayout(width: number) {
    if (width > 1400) {
      return CalendarColumnLayout.FULL;
    } else if (width > 900) {
      return CalendarColumnLayout.SPLIT;
    } else {
      return CalendarColumnLayout.TABS;
    }
  }

  /**
   * Notes on timeline:
   * - Sub timeline (hours for a day, days for a week etc) - Time blocking/slotting
   * - Collapsible all-day events, tasks inbox (collapsible so that timeline is not crowded)
   * - Past days/periods - will be more restrospective, future days will have planned events, tasks etc - current day/period tries to show both
   * - Timeline will move out of panel switcher when enough width is available for the calendar column
   * @param product
   */
  function resolvePanels(product: Product, layout: CalendarColumnLayout) {
    const timeline = {
      label: "Default",
      // tooltip: "Timeline",
      value: CalendarColumnPanel.Timeline,
      icon: "clock"
    };
    const tempHistory = {
      label: "History",
      // tooltip: "History",
      value: CalendarColumnPanel.History,
      icon: "history"
    };
    const overview = {
      label: "Overview",
      // tooltip: "Overview",
      value: CalendarColumnPanel.Overview,
      icon: "heroicons:rectangle-group"
      // icon: "grid"
    };
    const notes = {
      label: "Notes",
      // tooltip: "Notes",
      value: CalendarColumnPanel.Notes,
      icon: "note"
    };
    const tempTasksPanel = {
      label: "Tasks",
      // tooltip: "Tasks",
      value: CalendarColumnPanel.Tasks,
      icon: "check-square"
    };
    let items = [overview];
    switch (product) {
      case Product.POINTRON:
        items = [overview];
        break;
      case Product.MEMOTRON:
        items = [notes, tempHistory];
        break;
      case Product.NUCLEUS:
        items = [notes, overview];
        break;
      default:
        items = [overview];
    }
    if (layout === CalendarColumnLayout.TABS && product !== Product.MEMOTRON) {
      items = [timeline, ...items];
    }
    if (items.length === 1) {
      selectedPanel = items[0].value;
    }
    return items;
  }

  function handleDateChange(e: CustomEvent<Date>) {
    dispatch("dateChange", e.detail);
  }
</script>

<div
  class={cn("flex flex-col gap-3 pb-4 h-full w-full", {
    "px-4 pb-4 pt-2": layout !== CalendarColumnLayout.TABS,
    "p-4": layout === CalendarColumnLayout.TABS && !isCwContext
  })}
  id="mdcontainer-{mdId}"
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  {#if layout === CalendarColumnLayout.TABS}
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        {#if isCwContext && backPath}
          <Icon
            icon="ph:caret-left"
            class="text-fgs3"
            size={Size.lg}
            on:click={() => {
              appStore.gotoPath(backPath);
            }}
          />
        {/if}
        <div class="text-h4 font-medium text-fgs3">
          <!-- {formatDate(date)} -->
          <DatePicker bind:date on:change={handleDateChange} variant="inline" />
        </div>
        <!-- |
    <div class="text-b2 text-fgs3">
      {enumToString(selectedPanel)}
      </div> -->
      </div>
      <CalendarColumnPanelSelector
        bind:selectedPanel
        {layout}
        {panels}
        {isCwContext}
      />
    </div>
  {/if}
  <div class="flex gap-4 flex-grow w-full">
    {#key date.toISOString()}
      {#if (layout === CalendarColumnLayout.TABS && selectedPanel === CalendarColumnPanel.Timeline) || (layout !== CalendarColumnLayout.TABS && expansionMode === CalendarExpansionMode.JOURNAL)}
        <CalendarColumnTimeline
          {date}
          isExpandable={false}
          {layout}
          on:dateChange={handleDateChange}
        />
      {/if}
      {#if layout !== CalendarColumnLayout.TABS}
        <Divider orientation={Orientation.Vertical} />
        <div class="flex flex-col gap-4 flex-grow pt-2">
          {#if panels.length === 1}
            <Text
              content={selectedPanel}
              style={TextStyle.PANEL_HEADING_SMALL}
            />
          {:else}
            <CalendarColumnPanelSelector
              bind:selectedPanel
              {layout}
              {panels}
              {isCwContext}
            />
          {/if}
          <CalendarColumnPanelResolver
            {mdId}
            {selectedPanel}
            {date}
            {scale}
            {isRewind}
          />
        </div>
      {:else}
        <CalendarColumnPanelResolver
          {mdId}
          {selectedPanel}
          {date}
          {scale}
          {isRewind}
        />
      {/if}
      {#if layout !== CalendarColumnLayout.TABS && expansionMode === CalendarExpansionMode.TIMELINE}
        <CalendarColumnTimeline
          {date}
          isExpandable={true}
          {layout}
          on:dateChange={handleDateChange}
        />
      {/if}
    {/key}
  </div>
</div>

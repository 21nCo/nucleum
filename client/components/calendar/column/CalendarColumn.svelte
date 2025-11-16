<script lang="ts">
  import { resizeListener } from "@21n/actions/resize.action";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { Product } from "@21n/products/product.type";
  import { TextStyle } from "@21n/types/text.enum";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import {
    CalendarColumnLayout,
    CalendarColumnPanel,
    CalendarExpansionMode
  } from "@21n/components/calendar/calendar.type";
  import CalendarColumnPanelResolver from "@21n/components/calendar/column/CalendarColumnPanelResolver.svelte";
  import CalendarColumnPanelSelector from "@21n/components/calendar/column/CalendarColumnPanelSelector.svelte";
  import CalendarColumnTimeline from "@21n/components/calendar/column/timeline/CalendarColumnTimeline.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { page } from "$app/stores";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  import {
    resolveCalendarColumnPanels,
    resolveCalendarNotesId
  } from "@21n/components/calendar/calendar.utils";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import DayTimeline from "./timeline/daytimeline/DayTimeline.svelte";
  const dispatch = createEventDispatcher();

  export let scale: TimeScaleUnit;
  export let viewScale: TimeScaleUnit = TimeScaleUnit.DAY;
  export let date: Date;
  export let expansionMode: CalendarExpansionMode =
    CalendarExpansionMode.JOURNAL;
  export let isRewind: boolean = false;
  export let isCwContext: boolean = false;
  let mdId = generateSimpleRandomId();
  const backPath = $page.url.searchParams.get(AppSearchParam.RETURN_TO);

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

  $: panels = resolveCalendarColumnPanels($appStore.product, layout);
  $: if (panels.length === 1) {
    selectedPanel = panels[0].value;
  }

  function resolveLayout(width: number) {
    if (width > 1400) {
      return CalendarColumnLayout.FULL;
    } else if (width > 900) {
      return CalendarColumnLayout.SPLIT;
    } else {
      return CalendarColumnLayout.TABS;
    }
  }

  function handleDateChange(e: CustomEvent<Date>) {
    dispatch("dateChange", e.detail);
  }

  function openNotesInFullScreen() {
    const id = resolveCalendarNotesId(date, scale);
    if (!id) return;
    appStore.openResource(id, ResourceAccessMode.FULL);
  }
</script>

<div
  class="flex flex-col h-full w-full"
  id="mdcontainer-{mdId}"
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  {#if layout === CalendarColumnLayout.TABS}
    <div
      class="flex items-center justify-between border-b h-10 min-h-10 border-brs3"
    >
      <div class="flex items-center gap-2 hover:bg-bgs2-striped h-full">
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
        <div class="flex text-fgs2 h-full">
          <!-- {formatDate(date)} -->
          <DatePicker
            bind:date
            on:change={handleDateChange}
            variant="inline-with-icon"
          />
        </div>
      </div>
      <div class="flex items-center gap-2 h-full">
        <!-- TODO - open in full screen action -->
        <!-- {#if !$view.isPortrait && selectedPanel === CalendarColumnPanel.Notes}
          <Button
            icon="fullscreen"
            tooltip="Open notes in full screen"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            on:click={openNotesInFullScreen}
          />
        {/if} -->
        <CalendarColumnPanelSelector bind:selectedPanel {panels} />
      </div>
    </div>
  {/if}
  <div
    class={cn("w-full flex-grow", {
      "grid grid-cols-10": layout === CalendarColumnLayout.FULL,
      flex: layout !== CalendarColumnLayout.FULL
    })}
  >
    {#key date.toISOString()}
      {#if (layout === CalendarColumnLayout.TABS && selectedPanel === CalendarColumnPanel.Timeline) || (layout !== CalendarColumnLayout.TABS && expansionMode === CalendarExpansionMode.JOURNAL)}
        {#if viewScale === TimeScaleUnit.DAY}
          <div class="flex flex-grow col-span-3">
            <DayTimeline {date} {layout} />
          </div>
        {/if}
        <CalendarColumnTimeline
          {date}
          scale={viewScale}
          isExpandable={layout === CalendarColumnLayout.FULL}
          {layout}
          on:dateChange={handleDateChange}
        />
      {/if}
      {#if layout !== CalendarColumnLayout.TABS}
        {@const isShowNotesFullScreenButton =
          !$view.isPortrait && selectedPanel === CalendarColumnPanel.Notes}
        <div class="flex flex-col flex-grow border-l border-brs2 col-span-4">
          {#if panels.length === 1}
            <Text
              content={`${viewScale} ${selectedPanel}`}
              style={TextStyle.PANEL_HEADING_SMALL}
            />
          {:else}
            <div
              class="flex w-full justify-end gap-2 border-b border-brs2 h-10 min-h-10"
            >
              <!--TODO - full screen button for notes panel -->
              <!-- {#if isShowNotesFullScreenButton}
                <div class="flex items-center">
                  <Button
                    icon="fullscreen"
                    tooltip="Open notes in full screen"
                    style={ButtonStyle.OUTLINED}
                    size={Size.sm}
                    on:click={openNotesInFullScreen}
                  />
                </div>
              {/if} -->
              <CalendarColumnPanelSelector bind:selectedPanel {panels} />
            </div>
          {/if}
          <CalendarColumnPanelResolver
            {mdId}
            {selectedPanel}
            {date}
            {scale}
            {isRewind}
          />
        </div>
      {:else if selectedPanel !== CalendarColumnPanel.Timeline}
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
          scale={viewScale}
          isExpandable={true}
          {layout}
          on:dateChange={handleDateChange}
        />
      {/if}
    {/key}
  </div>
</div>

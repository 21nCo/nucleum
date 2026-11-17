<script lang="ts">
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "@21n/ui/elements/select/select.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";
  import type { ISelectValue } from "@21n/ui/elements/select/select.type";
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import Birdview from "@nucleum/features/calendar/birdView/Birdview.svelte";
  import {
    CalendarColumnLayout,
    CalendarColumnPanel,
    CalendarLayout
  } from "@nucleum/features/calendar/calendar.type";
  import CalendarLayoutView from "@nucleum/features/calendar/CalendarLayout.svelte";
  import CalendarHeader from "@nucleum/features/calendar/classic/CalendarHeader.svelte";
  import CalendarColumnPanelSelector from "../column/CalendarColumnPanelSelector.svelte";
  import { resolveCalendarColumnPanels } from "../calendar.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { useContextZoneSubViews } from "@nucleum/shell/topNav/contextZone/context-zone-sub-views.svelte";

  let {
    panel = $bindable(CalendarLayout.Bird),
    scale = $bindable(TimeScaleUnit.DAY)
  }: {
    panel?: CalendarLayout;
    scale?: TimeScaleUnit;
  } = $props();
  let selectedDate = $state(new Date());
  const isDev = import.meta.env?.DEV;
  let selectedPanel = $state(CalendarColumnPanel.Timeline);
  let birdviewRef = $state<Birdview>();

  /**
   * Moves one step back or forward from the header. The Year view moves the
   * header date a year and scrolls to it, so the header follows the
   * columns; other views move the columns one column.
   */
  function goBy(isForward: boolean) {
    if (scale !== TimeScaleUnit.YEAR) {
      birdviewRef?.step(isForward);
      return;
    }
    const date = new Date(selectedDate);
    date.setFullYear(date.getFullYear() + (isForward ? 1 : -1));
    selectedDate = date;
    birdviewRef?.scrollToDate(date);
  }

  const switchOptions = [
    {
      label: "Parts",
      icon: "text:P",
      value: TimeScaleUnit.PART
    },
    {
      label: "Days",
      icon: "text:D",
      value: TimeScaleUnit.DAY
    },
    {
      label: "Weeks",
      icon: "text:W",
      value: TimeScaleUnit.WEEK
    },
    {
      label: "Months",
      icon: "text:M",
      value: TimeScaleUnit.MONTH
    },
    {
      label: "Years",
      icon: "text:Y",
      value: TimeScaleUnit.YEAR
    }
  ];
  const scaleSubViews = useContextZoneSubViews(() =>
    isDev
      ? {
          values: switchOptions.map((option) => option.value),
          active: scale,
          select: (value) => {
            scale = value as TimeScaleUnit;
          }
        }
      : undefined
  );

  /** The scale as a calendar menu option group, for compact top bars. */
  function resolveScaleMenuGroup(): IContextMenuGroup[] {
    if (!isDev) return [];
    return [
      {
        group: "scale",
        items: [],
        option: {
          label: "Scale",
          options: switchOptions,
          value: scale,
          onChange: (value: ISelectValue) => {
            scale = value as TimeScaleUnit;
            scaleSubViews.touch();
          }
        }
      }
    ];
  }
</script>

<CalendarLayoutView
  overflowMenu={resolveScaleMenuGroup}
  contentKey={`${scale}|${selectedDate.toDateString()}`}
  bind:panel
  onGoToToday={() => {
    selectedDate = new Date();
    birdviewRef?.goToToday();
  }}
>
  {#snippet headerLeftOptions(_isCompact: boolean, isTight: boolean)}
    {#if isDev && !isTight}
      <OptionSelector
        options={switchOptions}
        size={Size.sm}
        bind:selected={scale}
        onSelect={() => scaleSubViews.touch()}
        parentBgIndex={2}
        isExpandOnActiveForIcon={true}
        style={OptionSelectorStyle.ICON}
      />
    {/if}
  {/snippet}
  {#snippet header(isShortDate: boolean)}
    <CalendarHeader
      {isShortDate}
      bind:selectedDate
      bind:selectedView={scale}
      onDateChange={() => birdviewRef?.scrollToDate(selectedDate)}
      onGoToPrevious={() => goBy(false)}
      onGoToNext={() => goBy(true)}
    />
  {/snippet}
  {#snippet headerRightOptions()}
    <!-- This panel switcher won't be necessary as the column will have the necessary information for all aspects and upon click - expands to show content similar to classic mode with panels inside it -->
    <!-- <CalendarColumnPanelSelector
      panels={resolveCalendarColumnPanels(
        $appStore.product,
        CalendarColumnLayout.TABS
      )}
      isBoxed={false}
      {selectedPanel}
    /> -->
  {/snippet}
  <div class="w-full h-full max-h-full">
    <Birdview bind:this={birdviewRef} mode={scale} />
  </div>
</CalendarLayoutView>

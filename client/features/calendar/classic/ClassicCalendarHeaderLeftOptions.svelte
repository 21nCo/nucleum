<script lang="ts">
  import { Size } from "@21n/ui/elements/size.enum";
  import DropDown from "@21n/ui/elements/dropdown/DropDown.svelte";
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "@21n/ui/elements/select/select.type";
  import view from "@21n/ui/environment/view.store";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import {
    isKeyTargetPane,
    isPlainPageKey
  } from "@nucleum/shell/shortcuts/page-keys";
  import {
    getContextZonePane,
    type ContextZonePane
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
  import {
    CALENDAR_HEATMAP_SCALE,
    resolveCalendarScales,
    type CalendarScale
  } from "@nucleum/features/calendar/calendar-route";

  let {
    selectedView = $bindable(TimeScaleUnit.MONTH),
    isRefreshing = false,
    parentBgIndex = 2,
    isScopeHidden = false,
    keyPane = undefined,
    keyRoot = undefined,
    onScaleSelection = undefined
  }: {
    selectedView?: TimeScaleUnit;
    isRefreshing?: boolean;
    parentBgIndex?: number;
    /** Hides the scope button, as when the controls are compact. */
    isScopeHidden?: boolean;
    /** Pane of the calendar page, used to decide whether scale keys apply. */
    keyPane?: ContextZonePane | undefined;
    /** Element of the calendar page, used to skip keys while it is covered. */
    keyRoot?: HTMLElement | undefined;
    onScaleSelection?:
      | ((event: CustomEvent<TimeScaleUnit>) => void)
      | undefined;
  } = $props();
  const isDev = import.meta.env?.DEV;

  const monthOption = {
    label: "Month",
    icon: "text:M",
    value: TimeScaleUnit.MONTH
  };
  const yearOption = {
    label: "Year",
    icon: "text:Y",
    value: TimeScaleUnit.YEAR
  };
  const dayOption = {
    label: "Day",
    icon: "text:D",
    value: TimeScaleUnit.DAY
  };
  const weekOption = {
    label: "Week",
    icon: "text:W",
    value: TimeScaleUnit.WEEK
  };
  const heatmapOption = {
    label: "Heatmap",
    icon: "text:E",
    value: "heatmap"
  };
  const optionsByScale: Partial<
    Record<CalendarScale, { label: string; icon: string; value: string }>
  > = {
    [TimeScaleUnit.DAY]: dayOption,
    [TimeScaleUnit.WEEK]: weekOption,
    [TimeScaleUnit.MONTH]: monthOption,
    [TimeScaleUnit.YEAR]: yearOption,
    [CALENDAR_HEATMAP_SCALE]: heatmapOption
  };
  const switchOptions = resolveCalendarScales(
    $appStore.product,
    CalendarLayout.Classic,
    Boolean(isDev)
  )
    .map((scale) => optionsByScale[scale])
    .filter(Boolean);

  const ownPane = getContextZonePane();
  let rootRef = $state<HTMLDivElement | undefined>();

  /**
   * D, W, M, Y and E pick the scale whose switcher shows that letter. The
   * calendar page passes its own pane and element, since these options may
   * draw in the top bar, outside the page.
   */
  function onScaleKey(event: KeyboardEvent) {
    if (!isPlainPageKey(event)) return;
    if (!isKeyTargetPane(keyPane ?? ownPane, keyRoot ?? rootRef)) return;
    const letter = `text:${event.key.toUpperCase()}`;
    const option = switchOptions.find((item) => item?.icon === letter);
    if (!option) return;
    event.preventDefault();
    handleScaleSelection(
      new CustomEvent("select", { detail: option.value as TimeScaleUnit })
    );
  }

  function handleScaleSelection(e: CustomEvent<TimeScaleUnit>) {
    if (!e.detail) return;
    selectedView = e.detail;
    uiState.setState(UIState.classicCalendarScale, selectedView, {
      scope: UIStateScope.DAP
    });
    onScaleSelection?.(e);
  }
</script>

<svelte:window onkeydown={onScaleKey} />

<div bind:this={rootRef} class="flex items-center gap-2">
  <div>
    {#if $view.isConstrainedWidth}
      <DropDown
        items={switchOptions}
        value={selectedView}
        isDisableSearch={true}
        width="min-w-32"
        size={Size.sm}
        isEnforceWidth={true}
        onSelect={handleScaleSelection}
      />
    {:else}
      <OptionSelector
        options={switchOptions}
        selected={selectedView}
        size={Size.sm}
        {parentBgIndex}
        isExpandOnActiveForIcon={true}
        style={OptionSelectorStyle.ICON}
        onSelect={handleScaleSelection}
      />
    {/if}
  </div>
  {#if isDev && !isScopeHidden}
    <Button icon="scope" tooltip="Calendar scope" />
  {/if}
</div>

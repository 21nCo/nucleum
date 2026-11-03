<script lang="ts">
  import { untrack } from "svelte";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import BirdCalendar from "@nucleum/features/calendar/birdView/BirdCalendar.svelte";
  import ClassicCalendar from "@nucleum/features/calendar/classic/ClassicCalendar.svelte";
  import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import view from "@21n/ui/environment/view.store";
  import CalendarCw from "@nucleum/features/calendar/CalendarCW.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import { Product } from "@nucleum/client/config/product.type";
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import {
    calendarViewSubPath,
    parseCalendarLayout,
    parseCalendarScale,
    type CalendarScale
  } from "@nucleum/features/calendar/calendar-route";

  let { subPath = undefined }: { subPath?: string[] } = $props();

  const product = $appStore.product;
  const isDev = Boolean(import.meta.env?.DEV);
  const initialView = resolveInitialView();
  let panel = $state<CalendarLayout>(initialView.layout);
  let scale = $state<TimeScaleUnit>(initialView.scale as TimeScaleUnit);
  let appliedSubPath = untrack(() => subPath?.join("/"));
  let previousPanel = panel;

  function resolveSavedLayout() {
    const layoutState = uiState.getState(UIState.calendarLayout, {
      scope: UIStateScope.DAP
    });
    if (layoutState === CalendarLayout.Bird) {
      return CalendarLayout.Classic;
    }
    return layoutState ?? CalendarLayout.Classic;
  }

  function resolveSavedScale(layout: CalendarLayout): CalendarScale {
    if (layout === CalendarLayout.Bird) return TimeScaleUnit.DAY;
    const scaleState = uiState.getState(UIState.classicCalendarScale, {
      scope: UIStateScope.DAP
    });
    const supportedScales =
      product === Product.MEMOTRON
        ? [TimeScaleUnit.MONTH, TimeScaleUnit.YEAR]
        : [
            TimeScaleUnit.DAY,
            TimeScaleUnit.WEEK,
            TimeScaleUnit.MONTH,
            TimeScaleUnit.YEAR
          ];
    return supportedScales.includes(scaleState)
      ? scaleState
      : TimeScaleUnit.YEAR;
  }

  function resolveSubPathView(segments: string[] | undefined) {
    const layout = parseCalendarLayout(segments?.[0], product, isDev);
    if (!layout) return;
    return {
      layout,
      scale: parseCalendarScale(segments?.[1], product, layout, isDev)
    };
  }

  function resolveInitialView() {
    const fromPath = resolveSubPathView(subPath);
    if (fromPath) {
      saveView(fromPath.layout, fromPath.scale);
      return {
        layout: fromPath.layout,
        scale: fromPath.scale ?? resolveSavedScale(fromPath.layout)
      };
    }
    const layout = resolveSavedLayout();
    return { layout, scale: resolveSavedScale(layout) };
  }

  function saveView(layout: CalendarLayout, viewScale?: CalendarScale) {
    uiState.setState(UIState.calendarLayout, layout, {
      scope: UIStateScope.DAP
    });
    if (layout === CalendarLayout.Classic && viewScale) {
      uiState.setState(UIState.classicCalendarScale, viewScale, {
        scope: UIStateScope.DAP
      });
    }
  }

  $effect(() => {
    const nextSubPath = subPath?.join("/");
    if (nextSubPath === appliedSubPath) return;
    appliedSubPath = nextSubPath;
    const fromPath = resolveSubPathView(subPath);
    if (!fromPath) return;
    saveView(fromPath.layout, fromPath.scale);
    previousPanel = fromPath.layout;
    panel = fromPath.layout;
    scale = (fromPath.scale ??
      resolveSavedScale(fromPath.layout)) as TimeScaleUnit;
  });

  $effect(() => {
    if (panel === previousPanel) return;
    previousPanel = panel;
    scale = resolveSavedScale(panel) as TimeScaleUnit;
  });

  $effect(() => {
    if (!subPath) return;
    const canonical = calendarViewSubPath({ layout: panel, scale });
    if (canonical.join("/") === subPath.join("/")) return;
    untrack(() => navigation.replacePagePath([Action.CALENDAR, ...canonical]));
  });
</script>

{#if $view.isConstrainedWidth}
  <CalendarCw />
{:else if panel === CalendarLayout.Bird}
  <BirdCalendar bind:panel bind:scale />
{:else if panel === CalendarLayout.Classic}
  <ClassicCalendar bind:panel bind:selectedView={scale} />
{/if}

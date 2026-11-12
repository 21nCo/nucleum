<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { tick, type Snippet } from "svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/ui/elements/select/select.type";
  import { CalendarLayout } from "@nucleum/features/calendar/calendar.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { Product } from "@nucleum/client/config/product.type";
  import { Action } from "@nucleum/client/config/action.enum";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { page } from "$app/stores";
  import BackButton from "@nucleum/shell/navigation/components/BackButton.svelte";
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import BoxButton from "@21n/ui/elements/button/BoxButton.svelte";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import {
    contextZone,
    type ContextZoneViews
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  let {
    panel = $bindable(CalendarLayout.Classic),
    children = undefined,
    header = undefined,
    headerLeftOptions = undefined,
    headerRightOptions = undefined,
    overflowMenu = undefined,
    onGoToToday = undefined
  }: {
    panel?: CalendarLayout;
    children?: Snippet | undefined;
    /** Date header; receives whether the date should be short. */
    header?: Snippet<[boolean]> | undefined;
    /**
     * Left header controls; receives whether the controls are compact and
     * whether they are tight (compact controls that still do not fit).
     */
    headerLeftOptions?: Snippet<[boolean, boolean]> | undefined;
    headerRightOptions?: Snippet | undefined;
    /** Extra calendar menu groups shown while the controls are tight. */
    overflowMenu?: (() => IContextMenuGroup[]) | undefined;
    onGoToToday?: (() => void) | undefined;
  } = $props();
  const panelOptions: ISelectItem[] = [
    {
      value: CalendarLayout.Bird,
      label: "Columns"
    },
    { value: CalendarLayout.Classic, label: "Classic" }
  ];
  const backPath = $derived(
    $page.url.searchParams.get(AppSearchParam.RETURN_TO)
  );
  const dev_enableBirdView = import.meta.env?.DEV;
  const isContextZoneHosted = contextZone.isHosted;
  const entryWidth = contextZone.entryWidth;
  let controlsRef = $state<HTMLDivElement | undefined>(undefined);
  const TIGHT_GAP_PX = 12;
  const LOOSE_GAP_PX = 28;
  const MENU_WIDTH_PX = 40;
  let groupWidths = $state<Record<string, number>>({});

  /**
   * Width the controls need at a level. Level 0 shows everything; level 1
   * moves Go to today and settings into the menu; level 2 shortens the date;
   * level 3 also moves the layout switcher; level 4 also moves the scale.
   */
  function requiredWidth(level: number, gap = TIGHT_GAP_PX) {
    const width = (key: string, fallback = 0) => groupWidths[key] ?? fallback;
    const layout = isLayoutSwitcher ? width("layout") : width("back");
    const date = width("date");
    const shortDate = width("date-short", date * 0.6);
    const scale = width("scale", width("scale-full"));
    const right = width("right", MENU_WIDTH_PX);
    const keptLayout = isLayoutSwitcher ? 0 : layout;
    const groups = [
      [layout, width("scale-full"), date, width("trailing")],
      [layout, scale, date, right],
      [layout, scale, shortDate, right],
      [keptLayout, scale, shortDate, right],
      [keptLayout, shortDate, right]
    ][level];
    const shown = groups.filter((value) => value > 0);
    return (
      shown.reduce((sum, value) => sum + value, 0) +
      gap * Math.max(0, shown.length - 1)
    );
  }

  const level = $derived.by(() => {
    if ($entryWidth === undefined || !groupWidths.date) return 0;
    const available = $entryWidth;
    for (const candidate of [0, 1, 2, 3]) {
      if (candidate === 3 && !isLayoutSwitcher) continue;
      if (requiredWidth(candidate) <= available) return candidate;
    }
    return 4;
  });
  const isCompact = $derived(level >= 1);
  const isShortDate = $derived(level >= 2);
  const isTight = $derived(level >= 4);
  const isLoose = $derived(
    level === 0 &&
      $entryWidth !== undefined &&
      $entryWidth >= requiredWidth(0, LOOSE_GAP_PX)
  );

  function measureGroups() {
    if (!controlsRef) return;
    const next = { ...groupWidths };
    let isChanged = false;
    for (const child of controlsRef.querySelectorAll<HTMLElement>(
      ":scope > [data-calendar-group]"
    )) {
      const key = child.dataset.calendarGroup!;
      const width = Math.ceil(child.getBoundingClientRect().width);
      if (next[key] !== width) {
        next[key] = width;
        isChanged = true;
      }
    }
    if (isChanged) groupWidths = next;
  }

  $effect(() => {
    if (!controlsRef) return;
    const element = controlsRef;
    const observer = new ResizeObserver(() => measureGroups());
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    measureGroups();
    return () => observer.disconnect();
  });

  $effect(() => {
    void level;
    tick().then(() => {
      measureGroups();
    });
  });

  function openCalendarSettings() {
    requireCommandHost().runAction(Action.CALENDAR_SETTINGS, {
      componentParams: {
        panel
      }
    });
  }

  function resolveOverflowMenu() {
    const layoutGroup =
      isLayoutSwitcher && level >= 3
        ? [
            {
              group: "layout",
              items: [],
              option: {
                label: "Layout",
                options: panelOptions,
                value: panel,
                onChange: (value: ISelectValue) => {
                  panel = value as CalendarLayout;
                  onPanelSwitch(new CustomEvent("select", { detail: value }));
                }
              }
            }
          ]
        : [];
    return [
      ...layoutGroup,
      ...(isTight ? (overflowMenu?.() ?? []) : []),
      {
        group: "calendar",
        items: [
          {
            value: "today",
            label: "Go to today",
            icon: "calendar",
            callback: async () => onGoToToday?.()
          },
          {
            value: "settings",
            label: "Calendar settings",
            icon: "sliders",
            callback: async () => openCalendarSettings()
          }
        ]
      }
    ];
  }
  const isLayoutSwitcher = $derived(
    $appStore.product === Product.NUCLEUM && dev_enableBirdView
  );

  const layoutViews = $derived<ContextZoneViews>({
    values: panelOptions.map((option) => String(option.value)),
    active: panel,
    select: (value) => {
      panel = value as CalendarLayout;
      onPanelSwitch(new CustomEvent("select", { detail: value }));
    }
  });

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(CalendarLayout).includes(event.detail))
      return;
    uiState.setState(UIState.calendarLayout, event.detail, {
      scope: UIStateScope.DAP
    });
  }
</script>

{#snippet layoutSwitcher()}
  <div class="h-full" data-testid="calendar-layout-switcher">
    <BoxSwitcher
      options={panelOptions}
      bind:selected={panel}
      onSelect={onPanelSwitch}
    />
  </div>
{/snippet}

{#snippet backButton(isTitle: boolean)}
  <BackButton
    isEnabled={backPath !== null}
    isPreventDefault={true}
    onclick={() => {
      if (backPath) navigation.gotoPath(backPath);
    }}
    class="h-full"
  >
    {#if isTitle}
      <Text content="Calendar" style={TextStyle.PANEL_HEADING_SMALL} />
    {/if}
  </BackButton>
{/snippet}

{#snippet trailingControls()}
  <div class="flex items-center text-fgs3 h-full">
    <BoxButton
      size={Size.sm}
      label="GO TO TODAY"
      width="px-2"
      onclick={() => {
        onGoToToday?.();
      }}
    />
  </div>
  {@render headerRightOptions?.()}
  <div class="flex items-center h-full w-10">
    <BoxButton
      icon="sliders"
      tooltip="Calendar settings"
      size={Size.sm}
      onclick={openCalendarSettings}
    />
  </div>
{/snippet}

{#if $isContextZoneHosted}
  <ContextZoneContent
    isInlineFallback={false}
    views={isLayoutSwitcher ? layoutViews : undefined}
  >
    <div
      bind:this={controlsRef}
      class="flex items-center h-full"
      style:column-gap={`${isLoose ? LOOSE_GAP_PX : TIGHT_GAP_PX}px`}
      data-testid="calendar-context-controls"
      data-compact={isCompact ? "true" : undefined}
      data-tight={isTight ? "true" : undefined}
      data-level={level}
    >
      {#if isLayoutSwitcher && level < 3}
        <div
          class="flex items-center h-full shrink-0"
          data-calendar-group="layout"
        >
          {@render layoutSwitcher()}
        </div>
      {:else if backPath !== null && !isLayoutSwitcher}
        <div
          class="flex items-center h-full shrink-0"
          data-calendar-group="back"
        >
          {@render backButton(false)}
        </div>
      {/if}
      <div
        class="flex items-center h-full gap-3 shrink-0"
        data-calendar-group={level === 0
          ? "scale-full"
          : isTight
            ? "scale-menu"
            : "scale"}
      >
        {@render headerLeftOptions?.(isCompact, isTight)}
      </div>
      <div
        class="flex items-center h-full shrink-0"
        data-calendar-group={isShortDate ? "date-short" : "date"}
      >
        {@render header?.(isShortDate)}
      </div>
      <div
        class="flex items-center h-full shrink-0"
        data-calendar-group={isCompact ? "right" : "trailing"}
      >
        {#if isCompact}
          {@render headerRightOptions?.()}
          <ContextMenuAction
            id="calendarContextZoneMenu"
            testId="calendar-overflow-menu"
            menuResolver={resolveOverflowMenu}
            size={Size.md}
            isBoxed={true}
            parentBgIndex={1}
            class="h-full w-10 app-framed:h-10 app-framed:rounded-[var(--app-control-radius)]"
            icon="more-outline-horizontal"
            position={Placement.BottomCenter}
          />
        {:else}
          {@render trailingControls()}
        {/if}
      </div>
    </div>
  </ContextZoneContent>
{/if}

<div
  class="flex flex-col h-full w-full otop:pt-12"
  data-testid={`calendar-layout-${panel}`}
>
  {#if !$isContextZoneHosted}
    <div class="flex items-center gap-4 border-b border-brs3 h-11 pl-3">
      <header class="grid grid-cols-3 w-full sticky top-0 z-10 h-full">
        <div class="flex items-center gap-4 h-full">
          {#if isLayoutSwitcher}
            {@render layoutSwitcher()}
          {:else}
            {@render backButton(true)}
          {/if}
          {@render headerLeftOptions?.(false, false)}
        </div>
        {@render header?.(false)}
        <div class="flex gap--2 justify-end items-center h-full w-full">
          {@render trailingControls()}
        </div>
      </header>
    </div>
  {/if}
  <div class="flex-1 min-h-0">
    {@render children?.()}
  </div>
</div>

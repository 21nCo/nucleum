<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import type { Snippet } from "svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import type { ISelectItem } from "@21n/ui/elements/select/select.type";
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
  import { cn } from "@21n/ui/environment/presentation";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import {
    contextZone,
    nextCycleValue
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  let {
    panel = $bindable(CalendarLayout.Classic),
    children = undefined,
    header = undefined,
    headerLeftOptions = undefined,
    headerRightOptions = undefined,
    onGoToToday = undefined
  }: {
    panel?: CalendarLayout;
    children?: Snippet | undefined;
    header?: Snippet | undefined;
    /** Left header controls; receives whether the controls are compact. */
    headerLeftOptions?: Snippet<[boolean]> | undefined;
    headerRightOptions?: Snippet | undefined;
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
  let fullControlsWidth = $state(0);
  let controlGroupCount = $state(0);
  const isCompact = $derived(
    fullControlsWidth > 0 &&
      $entryWidth !== undefined &&
      $entryWidth < fullControlsWidth
  );
  const isLoose = $derived(
    !isCompact &&
      fullControlsWidth > 0 &&
      $entryWidth !== undefined &&
      $entryWidth >=
        fullControlsWidth +
          Math.max(0, controlGroupCount - 1) * (LOOSE_GAP_PX - TIGHT_GAP_PX)
  );

  $effect(() => {
    if (!controlsRef || isCompact) return;
    const element = controlsRef;
    const measure = () => {
      if (isCompact) return;
      const groups = element.children.length;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      controlGroupCount = groups;
      fullControlsWidth =
        element.scrollWidth - Math.max(0, groups - 1) * (gap - TIGHT_GAP_PX);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  });

  function openCalendarSettings() {
    requireCommandHost().runAction(Action.CALENDAR_SETTINGS, {
      componentParams: {
        panel
      }
    });
  }

  function resolveOverflowMenu() {
    const layoutGroup = isLayoutSwitcher
      ? [
          {
            group: "layout",
            items: panelOptions.map((option) => ({
              value: option.value,
              label: `${option.label} view`,
              icon: option.value === panel ? "check" : "",
              callback: async () => {
                panel = option.value as CalendarLayout;
                onPanelSwitch(new CustomEvent("select", { detail: option.value }));
              }
            }))
          }
        ]
      : [];
    return [
      ...layoutGroup,
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

  function cycleLayout() {
    const next = nextCycleValue(
      panelOptions.map((option) => option.value as CalendarLayout),
      panel
    );
    if (!next) return;
    panel = next;
    onPanelSwitch(new CustomEvent("select", { detail: next }));
  }

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
  <div class="text-fgs3 h-full">
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
  <div class="h-full w-10">
    <BoxButton
      icon="sliders"
      tooltip="Calendar settings"
      size={Size.sm}
      onclick={openCalendarSettings}
    />
  </div>
{/snippet}

{#if $isContextZoneHosted}
  <ContextZoneContent isInlineFallback={false} cycle={cycleLayout}>
    <div
      bind:this={controlsRef}
      class="flex items-center h-full"
      style:column-gap={`${isLoose ? LOOSE_GAP_PX : TIGHT_GAP_PX}px`}
      data-testid="calendar-context-controls"
      data-compact={isCompact ? "true" : undefined}
    >
      {#if isLayoutSwitcher && !isCompact}
        {@render layoutSwitcher()}
      {:else if backPath !== null && !isLayoutSwitcher}
        {@render backButton(false)}
      {/if}
      <div class="flex items-center h-full gap-3 shrink-0">
        {@render headerLeftOptions?.(isCompact)}
      </div>
      <div class="flex items-center h-full shrink-0">
        {@render header?.()}
      </div>
      <div class="flex items-center h-full shrink-0">
        {#if isCompact}
          {@render headerRightOptions?.()}
          <ContextMenuAction
            id="calendarContextZoneMenu"
            testId="calendar-overflow-menu"
            menuResolver={resolveOverflowMenu}
            size={Size.md}
            isBoxed={true}
            parentBgIndex={1}
            class="h-full w-10"
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
          {@render headerLeftOptions?.(false)}
        </div>
        {@render header?.()}
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

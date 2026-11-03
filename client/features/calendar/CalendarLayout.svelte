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
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
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
    headerLeftOptions?: Snippet | undefined;
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
      onclick={() => {
        requireCommandHost().runAction(Action.CALENDAR_SETTINGS, {
          componentParams: {
            panel
          }
        });
      }}
    />
  </div>
{/snippet}

{#if $isContextZoneHosted}
  <ContextZoneContent isInlineFallback={false} cycle={cycleLayout}>
    <div
      class="flex items-center h-full gap-3"
      data-testid="calendar-context-controls"
    >
      {#if isLayoutSwitcher}
        {@render layoutSwitcher()}
      {:else if backPath !== null}
        {@render backButton(false)}
      {/if}
      <div class="flex items-center h-full gap-3">
        {@render headerLeftOptions?.()}
      </div>
      <div class="flex items-center h-full">
        {@render header?.()}
      </div>
      <div class="flex items-center h-full">
        {@render trailingControls()}
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
          {@render headerLeftOptions?.()}
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

<script lang="ts">
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "@21n/types/size.enum";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import type { ISelectItem } from "@21n/types/select.type";
  import { CalendarLayout } from "@21n/components/calendar/calendar.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { createEventDispatcher } from "svelte";
  import { Action } from "@21n/types/action.enum";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  export let panel: CalendarLayout = CalendarLayout.Classic;
  const dispatch = createEventDispatcher();
  const panelOptions: ISelectItem[] = [
    { value: CalendarLayout.Classic, label: "Classic" },
    {
      value: CalendarLayout.Bird,
      label: "Columns"
      // badge: "planned",
      // isDisabled: true
    }
  ];
  const backPath = $page.url.searchParams.get(AppSearchParam.RETURN_TO);
  const dev_enableBirdView = import.meta.env?.DEV;

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(CalendarLayout).includes(event.detail))
      return;
    uiState.setState(UIState.calendarLayout, event.detail, {
      scope: UIStateScope.DAP
    });
  }
</script>

<div class="flex flex-col h-full w-full otop:pt-12">
  <div
    class="flex items-center gap-4 border-b border-brs3 h-[3.2rem] 2k:h-14 px-4"
  >
    <header class="grid grid-cols-3 w-full sticky top-0 z-10">
      <div class="flex items-center gap-4">
        <BackButton
          isEnabled={backPath !== null}
          isPreventDefault={true}
          on:click={() => {
            if (backPath) appStore.gotoPath(backPath);
          }}
        >
          {#if $appStore.product === Product.NUCLEUS && dev_enableBirdView}
            <PanelSwitcher
              items={panelOptions}
              bind:value={panel}
              style={PanelSwitcherStyle.TRAIN}
              size={Size.sm}
              activeItemStrength={PanelSwitcherActiveItemStrength.STRONG}
              on:switch={onPanelSwitch}
            />
          {:else}
            <Text content="Calendar" style={TextStyle.PANEL_HEADING_SMALL} />
          {/if}
        </BackButton>
        <slot name="header-left-options" />
      </div>
      <slot name="header" />
      <div class="flex gap-2 justify-end items-center">
        <slot name="header-right-options" />
        <Button
          type={ButtonVariant.SECONDARY}
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          label="Go to today"
          isPreventMinWidth={true}
          parentBgIndex={2}
          on:click={() => {
            dispatch("goToToday");
          }}
        />
        <Button
          type={ButtonVariant.SECONDARY}
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          icon="sliders"
          tooltip="Calendar settings"
          parentBgIndex={2}
          on:click={() => {
            appStore.runAction(Action.CALENDAR_SETTINGS, {
              componentParams: {
                panel
              }
            });
          }}
        />
      </div>
    </header>
  </div>
  <div class="flex-1 min-h-0">
    <slot />
  </div>
</div>

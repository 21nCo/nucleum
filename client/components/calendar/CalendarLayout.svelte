<script lang="ts">
  import type { Snippet } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import type { ISelectItem } from "@21n/types/select.type";
  import { CalendarLayout } from "@21n/components/calendar/calendar.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Action } from "@21n/types/action.enum";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  import BoxButton from "@21n/elements/button/BoxButton.svelte";
  import { onMount } from "svelte";
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
  let backPath = $state(
    new URLSearchParams(window.location.search).get(AppSearchParam.RETURN_TO)
  );
  const dev_enableBirdView = import.meta.env?.DEV;

  onMount(() => {
    const unsubscribe = page.subscribe((p) => {
      backPath = p?.url?.searchParams.get(AppSearchParam.RETURN_TO) ?? null;
    });
    return () => unsubscribe?.();
  });

  function onPanelSwitch(event: CustomEvent) {
    if (!event.detail || !Object.values(CalendarLayout).includes(event.detail))
      return;
    uiState.setState(UIState.calendarLayout, event.detail, {
      scope: UIStateScope.DAP
    });
  }
</script>

<div class="flex flex-col h-full w-full otop:pt-12">
  <div class="flex items-center gap-4 border-b border-brs3 h-11 pl-3">
    <header class="grid grid-cols-3 w-full sticky top-0 z-10 h-full">
      <div class="flex items-center gap-4 h-full">
        {#if $appStore.product === Product.NUCLEUM && dev_enableBirdView}
          <div class="h-full">
            <BoxSwitcher
              options={panelOptions}
              bind:selected={panel}
              onSelect={onPanelSwitch}
            />
          </div>
        {:else}
          <BackButton
            isEnabled={backPath !== null}
            isPreventDefault={true}
            onclick={() => {
              if (backPath) appStore.gotoPath(backPath);
            }}
            class="h-full"
          >
            <Text content="Calendar" style={TextStyle.PANEL_HEADING_SMALL} />
          </BackButton>
        {/if}
        {@render headerLeftOptions?.()}
      </div>
      {@render header?.()}
      <div class="flex gap--2 justify-end items-center h-full w-full">
        <!--<Button-->
        <!--  type={ButtonVariant.SECONDARY}-->
        <!--  style={ButtonStyle.OUTLINED}-->
        <!--  size={Size.sm}-->
        <!--  label="Today"-->
        <!--  isPreventMinWidth={true}-->
        <!--  parentBgIndex={2}-->
        <!--  onclick={() => {-->
        <!--    onGoToToday?.();-->
        <!--  }}-->
        <!--/>-->
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
        <!--<Button-->
        <!--  type={ButtonVariant.SECONDARY}-->
        <!--  style={ButtonStyle.OUTLINED}-->
        <!--  size={Size.sm}-->
        <!--  icon="sliders"-->
        <!--  tooltip="Calendar settings"-->
        <!--  parentBgIndex={2}-->
        <!--  onclick={() => {-->
        <!--    appStore.runAction(Action.CALENDAR_SETTINGS, {-->
        <!--      componentParams: {-->
        <!--        panel-->
        <!--      }-->
        <!--    });-->
        <!--  }}-->
        <!--/>-->
        <div class="h-full w-10">
          <BoxButton
            icon="sliders"
            tooltip="Calendar settings"
            size={Size.sm}
            onclick={() => {
              appStore.runAction(Action.CALENDAR_SETTINGS, {
                componentParams: {
                  panel
                }
              });
            }}
          />
        </div>
      </div>
    </header>
  </div>
  <div class="flex-1 min-h-0">
    {@render children?.()}
  </div>
</div>

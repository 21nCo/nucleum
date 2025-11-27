<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import view from "@21n/stores/view.store";
  import type { IButtonParams } from "@21n/types/button.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import { appEvents } from "@21n/stores/notification.store";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { Display } from "@21n/types/view.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  import { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
  import { tooltip } from "@21n/actions/popover.action";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import type { InputLabelInfoToolTip } from "@21n/types/input.type";
  import FormLabelTooltip from "@21n/elements/text/formLabel/FormLabelTooltip.svelte";
  import { fly } from "svelte/transition";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  import ButtonGroup from "@21n/elements/button/ButtonGroup.svelte";
  const dispatch = createEventDispatcher();

  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PANEL_HEADING;
  export let floatingButton: IButtonParams | IButtonParams[] | undefined =
    undefined;
  export let panelSize: Size.sm | Size.md | Size.lg | Size.xl = Size.md;
  export let isNavActivated: boolean = false;
  export let isShowBackButton: boolean = false;
  export let parentBgIndex: number = 1;
  /**
   * If true, the panel will be expanded by default and there will be no right slot for record view.
   */
  export let isExpanded: boolean = false;
  export let isProminentDivider: boolean = false;
  export let extraLargeScreenComponent: string | undefined = undefined;
  export let info: InputLabelInfoToolTip | undefined = undefined;
  export let isPreventCwPadding: boolean = false;
  export let isHideRightSplit: boolean = false;
  let isExplicitlyCollapsed = false;

  onMount(() => {
    const unsubscribe = appEvents.subscribe((e) => {
      if (e.event === GlobalEvent.APP_MENU_SWITCHED) {
        const currentPath = window?.location?.pathname?.replace("/", "");
        if (currentPath !== e.value) return;
        isCollapsed = !isCollapsed;
        isExplicitlyCollapsed = false;
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  let isCollapsed = false;

  $: isShowCollapseButton =
    $view.display !== Display.TK &&
    !$view.isConstrainedWidth &&
    panelSize !== Size.xl &&
    $appStore.interactionMode !== InteractionMode.AGENT;
  $: isExtraLargeScreen = $view.landscapiness > 1.7 && $view.scale > 1.8;
</script>

<div class="flex w-full h-full">
  {#if !isCollapsed}
    <div
      class={cn(
        "relative flex flex-col h-full",
        {
          "w-full": $view.isConstrainedWidth || isExpanded,
          "otop:pt-12": !isPreventCwPadding
        },
        !$view.isConstrainedWidth &&
          !isExpanded && {
            "w-[20rem] min-w-[20rem]": panelSize === Size.sm,
            "w-[24rem] min-w-[24rem] 2k:w-[28rem] 2k:min-w-[28rem]":
              panelSize === Size.md,
            "w-[28rem] min-w-[28rem]": panelSize === Size.lg,
            "w-1/2 min-w-1/2": panelSize === Size.xl
          }
      )}
      in:fly={{ x: -10 }}
    >
      {#if !isNavActivated && (title || isShowCollapseButton)}
        <div
          class={cn(
            "flex justify-between items-center w-full px-4 pt-2 overflow-auto min-h-fit mo:min-h-14"
          )}
        >
          <BackButton
            isEnabled={isShowBackButton}
            {parentBgIndex}
            isPreventDefault={true}
            on:click={() => dispatch("back")}
          >
            <Text style={titleStyle} content={title || ""} />
            {#if info}
              <FormLabelTooltip {info} />
            {/if}
          </BackButton>
          <slot name="toprightactions">
            {#if !isExpanded && isShowCollapseButton && !isShowBackButton}
              <button
                class="flex items-center text-fgs3 p-1 hover:bg-bgs2 rounded-md"
                use:tooltip={{
                  text: "Collapse panel"
                }}
                on:click={() => {
                  isCollapsed = true;
                  isExplicitlyCollapsed = true;
                }}
              >
                <Icon icon="chevron-left" class="text-fgs3" size={Size.lg} />
              </button>
            {/if}
          </slot>
        </div>
      {/if}
      {#if $$slots.nonpadded}
        <slot name="nonpadded" />
      {:else if isNavActivated && $$slots.nav}
        <!-- TODO - overlay nav on top and add gesture to go back instead / or use safari webview existing gesture for browser back navigation -->
        <slot name="nav" />
      {:else}
        <div class="px-4 flex-grow">
          <slot />
        </div>
      {/if}
      {#if floatingButton}
        <ButtonGroup
          isFooter={true}
          buttons={Array.isArray(floatingButton)
            ? [...floatingButton]
            : [floatingButton]}
        />
      {/if}
    </div>
  {/if}
  {#if !$view.isConstrainedWidth && !isExpanded && !isHideRightSplit}
    <!-- Right split -->
    {#if $$slots.right}
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Normal}
      />
    {/if}
    {#if isProminentDivider}
      <div class="w-0.5 bg-bgs2"></div>
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Normal}
      />
    {/if}
    <div
      class={cn("relative flex flex-grow h-full", {
        "max-w-6xl": extraLargeScreenComponent
      })}
    >
      <slot name="right" />
    </div>
    {#if isExtraLargeScreen && extraLargeScreenComponent}
      <div class="flex h-full flex-grow">
        <ComponentResolver path={extraLargeScreenComponent} />
      </div>
    {/if}
  {/if}
</div>
<svelte:window
  on:collapsePanel={() => (isCollapsed = $view.display !== Display.TK && true)}
  on:expandPanel={() => {
    if (isExplicitlyCollapsed) return;
    isCollapsed = false;
  }}
/>

<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Display } from "$lib/client/types/view.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { tooltip } from "$lib/client/actions/popover.action";
  import ComponentResolver from "./ComponentResolver.svelte";
  import type { InputLabelInfoToolTip } from "$lib/client/types/input.type";
  import FormLabelTooltip from "$lib/client/elements/text/formLabel/FormLabelTooltip.svelte";
  import { fly } from "svelte/transition";
  const dispatch = createEventDispatcher();

  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PAGE_HEADING_SUBTLE;
  export let floatingButton: IButtonParams | IButtonParams[] | undefined =
    undefined;
  export let panelSize: Size.sm | Size.md | Size.lg | Size.xl = Size.md;
  export let isNavActivated: boolean = false;
  export let isShowBackButton: boolean = false;
  /**
   * If true, the panel will be expanded by default and there will be no right slot for record view.
   */
  export let isExpanded: boolean = false;
  export let isProminentDivider: boolean = false;
  export let extraLargeScreenComponent: string | undefined = undefined;
  export let info: InputLabelInfoToolTip | undefined = undefined;
  let isExplicitlyCollapsed = false;

  onMount(() => {
    const unsubscribe = appEvents.subscribe((e) => {
      if (e.event === GlobalEvent.APP_MENU_SWITCHED) {
        isCollapsed = false;
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
    $appStore.interactionMode !== InteractionMode.COMMAND_ONLY &&
    $appStore.interactionMode !== InteractionMode.AGENT;

  $: isExtraLargeScreen = $view.landscapiness > 1.7 && $view.scale > 1.8;
</script>

<div class="flex w-full h-full">
  {#if !isCollapsed}
    <div
      class={cn(
        "relative flex flex-col h-full",
        {
          "w-full": $view.isConstrainedWidth || isExpanded
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
        <button
          class={cn(
            "flex justify-between items-center w-full px-4 pt-2 overflow-auto min-h-fit mo:min-h-14"
          )}
          tabindex={isShowBackButton ? 0 : -1}
          on:click={() => {
            if (isShowBackButton) dispatch("back");
          }}
        >
          <div
            class={cn("flex items-center gap-2", {
              "active:bg-bgs2 rounded-md px-1": isShowBackButton
            })}
          >
            {#if isShowBackButton}
              <Icon
                icon="ph:caret-left"
                class="text-fgs3 opacity-40"
                size={Size.lg}
              />
            {/if}
            <Text style={titleStyle} content={title || ""} />
            {#if info}
              <FormLabelTooltip {info} />
            {/if}
          </div>
          <slot name="toprightactions">
            {#if !isExpanded && isShowCollapseButton}
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
                <Icon
                  icon="chevron-left"
                  class="text-fgs3"
                  size={Size.lg}
                />
              </button>
            {/if}
          </slot>
        </button>
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
        <FloatingButton
          params={Array.isArray(floatingButton)
            ? floatingButton
            : [floatingButton]}
        />
      {/if}
    </div>
  {/if}
  {#if !$view.isConstrainedWidth && !isExpanded}
    <!-- Right split -->
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Normal}
    />
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

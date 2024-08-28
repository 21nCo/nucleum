<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { Size } from "$lib/client/types/size.enum";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { Position } from "$lib/client/types/direction.enum";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { uiStateDerived } from "$lib/client/stores/uiState/uiState.store";
  import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";
  const dispatch = createEventDispatcher();
  export let item: IAction;
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  $: isShowHotKeyHint =
    $uiStateDerived?.isShowHotKeyHints &&
    layoutContext === LayoutContext.DEFAULT;
  $: isActive =
    $page.params.route?.includes(item.path ?? item.action) ||
    $page.route.id?.includes(item.path ?? item.action);
  export let isShowLabel: boolean = true;
  export let parentBackgroundIndex: number;
  let buttonRef: HTMLElement;
  let isHovering: boolean = false;
  let pad: number;
  let rive: any;
  let isOutlineStyle: boolean = false;
  $: if ($view.height) {
    let rawPad = ($view.width / 10) * $view.scale;
    pad = rawPad > 30 ? 30 : rawPad;
  }
  $: tooltip = layoutContext === LayoutContext.THIN ? item.label : undefined;
  onMount(() => {
    uiStateDerived.refreshShortcutHintsState();
  });
  function onClick() {
    postMessageToParent(EmbedMessage.MENU_ITEM_SELECTED);
    rive?.fire();
    dispatch("click", {});
  }
  function onHover() {
    rive?.fire();
  }
  function resolveHotKey() {
    const keyMap = keyboardShortcuts.fecthKeyMap();
    const shortcut = keyMap.find((x) => x.action === item.action);
    if (!shortcut) return;
    return shortcut.key;
  }
</script>

{#key tooltip}
  <HoverableElement
    type="button"
    {tooltip}
    tooltipOptions={{ placement: Position.Right }}
    class={cn(
      "flex items-center cursor-pointer",
      (layoutContext === LayoutContext.DEFAULT ||
        layoutContext === LayoutContext.MINIMIZED) && {
        "bg-aps3 border-aps2 border text-aps1 hover:bg-aps2 hover:bg-opacity-70":
          isActive && isOutlineStyle,
        "hover:bg-bgs3": !isActive,
        [abg()]: isActive && !isOutlineStyle,
        "border border-transparent": !isActive && isOutlineStyle
      },
      layoutContext === LayoutContext.PORTRAIT && {
        "w-12 flex-col gap-1 text-b4 rounded-lg": isShowLabel,
        "text-aps1": isActive
      },
      {
        "text-b2 gap-2 rounded-lg p-2 h-9":
          isShowLabel && layoutContext != LayoutContext.PORTRAIT,
        "p-4 rounded-full": !isShowLabel,
        "justify-between": isShowHotKeyHint
      }
    )}
    on:click={onClick}
    bind:isHovering
  >
    <div
      class={cn("flex gap-1", {
        "flex-col items-center": layoutContext === LayoutContext.PORTRAIT
      })}
    >
      {#if item.icon && item.icon != "initials"}
        <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
        <div class="w-6 flex justify-center" bind:this={buttonRef}>
          <Icon
            icon={item.icon}
            size={layoutContext === LayoutContext.THIN ||
            layoutContext === LayoutContext.PORTRAIT
              ? Size.md
              : Size.sm}
            class={cn(
              (layoutContext === LayoutContext.DEFAULT ||
                layoutContext === LayoutContext.MINIMIZED) && {
                "fill-aps1": isActive && isOutlineStyle,
                "fill-abg": isActive && !isOutlineStyle
              },
              (layoutContext === LayoutContext.PORTRAIT ||
                layoutContext === LayoutContext.THIN) && {
                "fill-aps1": isActive
              }
            )}
          />
        </div>
      {:else if item.icon == "initials"}
        <div class=" w-6 flex justify-center {isActive ? 'font-medium' : ''}">
          {"Pr"}
        </div>
      {/if}
      {#if isShowLabel}
        {item.label}
      {/if}
    </div>
    {#if isShowHotKeyHint}
      <span
        class={cn(
          "flex justify-center items-center w-5 h-5 text-b4 rounded-md",
          {
            "bg-aps2 text-fgs1": isActive,
            "bg-bgs3": !isActive
          }
        )}
      >
        {resolveHotKey()?.toUpperCase() ?? ""}
      </span>
    {/if}
  </HoverableElement>
{/key}

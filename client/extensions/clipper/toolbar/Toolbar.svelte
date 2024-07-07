<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "../HightlightColorItem.svelte";
  import { ClipperExtensionEvent } from "$lib/client/types/memotron/clip.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Position, Orientation } from "$lib/client/types/direction.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { store, toolbarState } from "../contentScripts/store";
  const dispatch = createEventDispatcher();
  export let colors: string[] = [];
  export let activeColor: string | null = null;
  export let position: Position.Right | Position.Left | Position.Bottom =
    Position.Right;
  let isAutoHighlighterExpanded = false;
  $: buttonParams = {
    tooltipOptions: {
      placement:
        position === Position.Bottom ? Position.TopCenter : Position.Left,
      isUseAbsolutePositioning: true,
      offsetInPx: 8
    }
  };
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.event === ClipperExtensionEvent.PAGE_SAVING_STATUS &&
      message.node
    ) {
      $store.id = message.node;
    }
  });
  function toggleAutoHighligher() {
    isAutoHighlighterExpanded = !isAutoHighlighterExpanded;
    if (!isAutoHighlighterExpanded) {
      activeColor = null;
      dispatch("color", 0);
    }
  }
</script>

<div
  class={cn(
    "fixed bg-bgs1 border border-brs3 rounded-full min-h-fit flex gap-3  justify-center items-center shadow-md",
    {
      "right-0 top-1/2 flex-col w-10 2k:w-12 mr-4 2k:mr-6 py-3 transform -translate-y-1/2 space-y-1.5":
        position === Position.Right,
      "bottom-0 right-1/2 transform translate-x-1/2 flex-row py-3 mb-4 px-6":
        position === Position.Bottom
    }
  )}
>
  {#if $store?.id}
    <button
      class="flex border border-transparent outline-dotted outline-fgs2 hover:outline-aps1 rounded-full"
    >
      <Icon
        icon="check-circle"
        on:click={() => {
          dispatch("saved");
        }}
        class="fill-fgs2"
      />
    </button>
  {:else}
    <Button
      icon="plus"
      tooltip="Save page"
      {...buttonParams}
      on:click={() => {
        dispatch("save");
      }}
    />
  {/if}
  <Button
    icon="cube-transparent"
    tooltip="Snip"
    {...buttonParams}
    on:click={() => {
      dispatch("snip");
    }}
  />
  <Button
    icon="document-text"
    tooltip="Generate summary"
    {...buttonParams}
    on:click={() => {
      dispatch("summarize");
    }}
  />
  <div
    class={cn("flex gap-2 items-center", {
      "flex-col w-full":
        position === Position.Right || position === Position.Left,
      "flex-row h-full": position === Position.Bottom
    })}
  >
    <Divider
      orientation={position === Position.Bottom
        ? Orientation.Vertical
        : Orientation.Horizontal}
    />
    <Button
      icon="pencil"
      {...buttonParams}
      tooltip="Auto Highlight"
      on:click={toggleAutoHighligher}
    />
    {#if isAutoHighlighterExpanded}
      <div
        class={cn("flex gap-2 items-center justify-center", {
          "flex-col w-full":
            position === Position.Right || position === Position.Left,
          "flex-row h-full": position === Position.Bottom
        })}
      >
        {#each colors as color}
          <HightlightColorItem
            {color}
            isActive={color === activeColor}
            on:click={() => {
              // console.log(color);
              activeColor = color;
              dispatch("color", color);
            }}
          />
        {/each}
      </div>
    {/if}
    <Divider
      orientation={position === Position.Bottom
        ? Orientation.Vertical
        : Orientation.Horizontal}
    />
  </div>
  <Button
    icon="home"
    tooltip="Open Side bar"
    {...buttonParams}
    on:click={() => {
      //Open sidebar
    }}
  />
  <Button
    icon={position === Position.Right ? "arrow-down-left" : "arrow-up-right"}
    tooltip={position === Position.Right ? "Move to bottom" : "Move to right"}
    {...buttonParams}
    on:click={() => {
      let val;
      if (position === Position.Right) {
        val = Position.Bottom;
      } else if (position === Position.Bottom) {
        val = Position.Right;
      }
      toolbarState.changePosition(val);
    }}
  />
  <Button
    icon="cross-circled"
    tooltip="Collapse"
    {...buttonParams}
    on:click={() => {
      dispatch("collapse");
    }}
  />
</div>

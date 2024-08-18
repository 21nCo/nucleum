<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "../HightlightColorItem.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Position, Orientation } from "$lib/client/types/direction.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { webpage, toolbarState } from "../contentScripts/store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { screenShotOnlyPages } from "$lib/client/products/memotron/common/urlMap";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  const dispatch = createEventDispatcher();
  export let activeHighlighter: string | null = null;
  export let isSnipActive: boolean = false;
  export let contentType: NodeType = NodeType.WEB_PAGE;

  let isAutoHighlighterExpanded = false;
  $: isScreenShotOnly = screenShotOnlyPages.some((regex) =>
    regex.test($webpage.url)
  );

  if ($toolbarState.position === undefined) {
    toolbarState.changePosition(Position.Right);
  }

  $: tooltipOptions = {
    placement:
      $toolbarState.position === Position.Bottom
        ? Position.TopCenter
        : Position.Left,
    isUseAbsolutePositioning: true,
    offsetInPx: 8
  };
  $: buttonParams = {
    tooltipOptions
  };
  function toggleAutoHighligher() {
    isAutoHighlighterExpanded = !isAutoHighlighterExpanded;
    if (!isAutoHighlighterExpanded) {
      activeHighlighter = null;
      dispatch("color", 0);
    }
  }
</script>

<div
  class={cn(
    "fixed bg-bgs1 border border-brs3 rounded-full min-h-fit flex gap-3  justify-center items-center shadow-md",
    {
      "right-0 top-1/2 flex-col w-10 2k:w-12 mr-4 2k:mr-6 py-3 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Position.Right,
      "bottom-0 right-1/2 transform translate-x-1/2 flex-row py-3 mb-4 px-6":
        $toolbarState.position === Position.Bottom
    }
  )}
>
  {#if !isScreenShotOnly}
    {#if $webpage?.id}
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
        tooltip={`Save ${enumToString(contentType)}`}
        {...buttonParams}
        on:click={() => {
          dispatch("save");
        }}
      />
    {/if}
  {/if}
  <Toggle
    icon="cube-transparent"
    tooltip="Snip"
    size={Size.sm}
    bind:on={isSnipActive}
    {tooltipOptions}
  />
  {#if !isScreenShotOnly}
    <Button
      icon="document-text"
      tooltip="Generate summary"
      {...buttonParams}
      on:click={() => {
        dispatch("summarize");
      }}
    />
  {/if}
  <div
    class={cn("flex gap-2 items-center", {
      "flex-col w-full":
        $toolbarState.position === Position.Right ||
        $toolbarState.position === Position.Left,
      "flex-row h-full": $toolbarState.position === Position.Bottom
    })}
  >
    <Divider
      orientation={$toolbarState.position === Position.Bottom
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
            $toolbarState.position === Position.Right ||
            $toolbarState.position === Position.Left,
          "flex-row h-full": $toolbarState.position === Position.Bottom
        })}
      >
        {#each $highlightStore.highlighters as highlighter}
          <HightlightColorItem
            {highlighter}
            isActive={highlighter.id === activeHighlighter}
            on:click={() => {
              activeHighlighter = highlighter.id;
              dispatch("color", highlighter);
            }}
          />
        {/each}
      </div>
    {/if}
    <Divider
      orientation={$toolbarState.position === Position.Bottom
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
    icon={$toolbarState.position === Position.Right
      ? "arrow-down-left"
      : "arrow-up-right"}
    tooltip={$toolbarState.position === Position.Right
      ? "Move to bottom"
      : "Move to right"}
    {...buttonParams}
    on:click={() => {
      let val;
      if ($toolbarState.position === Position.Right) {
        val = Position.Bottom;
      } else if ($toolbarState.position === Position.Bottom) {
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

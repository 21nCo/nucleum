<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import HightlightColorItem from "$lib/client/products/memotron/common/highlighters/HightlightColorItem.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Placement, Orientation } from "$lib/client/types/direction.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { webpage, toolbarState, syncStore } from "../contentScripts/store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    saveOnlyPages,
    screenShotOnlyPages
  } from "$lib/client/products/memotron/common/urlMap";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
  import { fly, scale } from "svelte/transition";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { hoverable } from "$lib/client/actions/hover.action";
  const dispatch = createEventDispatcher();
  export let activeHighlighter: string | null = null;
  export let isSnipActive: boolean = false;
  export let contentType: NodeType = NodeType.WEB_PAGE;
  export let isDragging: boolean = false;
  export let isSidePanelOpen: boolean = false;
  let isHovering = false;
  let isSidePanelAvailable = true;
  let isAutoHighlighterExpanded = false;
  $: isScreenShotOnly = screenShotOnlyPages.some((regex) =>
    regex.test($webpage.url)
  );

  $: isSaveOnly = saveOnlyPages.some((regex) => regex.test($webpage.url));

  if ($toolbarState.position === undefined) {
    toolbarState.changePosition(Placement.Right);
  }

  $: tooltipOptions = {
    placement:
      $toolbarState.position === Placement.Bottom
        ? Placement.TopCenter
        : Placement.Left,
    isUseAbsolutePositioning: true,
    offsetInPx: 8
  };
  $: buttonParams = {
    tooltipOptions
  };

  onMount(() => {
    setTimeout(() => {
      const arcBrowserCssVal = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--arc-palette-title");
      isSidePanelAvailable = arcBrowserCssVal ? false : true;
    }, 2000);
  });

  function toggleAutoHighligher() {
    if (!isAutoHighlighterExpanded) {
      activeHighlighter = null;
      dispatch("color", 0);
    } else {
      resetAll("highlighter");
      const highlighter = $highlightStore.highlighters[0];
      if (!highlighter) return;
      dispatch("color", highlighter);
      activeHighlighter = highlighter.id;
    }
  }

  function resetAll(except: string) {
    if (except !== "highlighter") {
      isAutoHighlighterExpanded = false;
    }
    if (except !== "snip") {
      isSnipActive = false;
    }
  }

  function resolveFlyParams(position: Placement) {
    if (position === Placement.Right) {
      return {
        x: 10,
        duration: 300
      };
    } else if (position === Placement.Left) {
      return {
        x: -10,
        duration: 300
      };
    } else if (position === Placement.Bottom) {
      return {
        y: 10,
        duration: 300
      };
    }
  }
</script>

<button
  class={cn(
    "fixed bg-bgs1 border border-brs3 rounded-full min-h-fit min-w-fit flex gap-4 justify-center items-center shadow-md",
    {
      "w-11 2k:w-12 inset-y-0 my-auto flex-col py-3":
        $toolbarState.position === Placement.Right ||
        $toolbarState.position === Placement.Left,
      "right-0 mr-4 2k:mr-6": $toolbarState.position === Placement.Right,
      "left-0 ml-4 2k:ml-6": $toolbarState.position === Placement.Left,
      "h-12 w-fit inset-x-0 mx-auto bottom-0 mb-4 px-3":
        $toolbarState.position === Placement.Bottom
    }
  )}
  draggable="true"
  on:dragstart={() => (isDragging = true)}
  on:dragend={() => (isDragging = false)}
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
    }
  }}
  in:fly={resolveFlyParams($toolbarState.position)}
  out:scale
>
  {#if !isScreenShotOnly && !$syncStore.id}
    {#if $webpage?.id}
      <button
        class="flex border border-transparent outline-dotted outline-fgs2 hover:outline-aps1 rounded-full"
        use:tooltip={{
          text: "This page is already saved. Click to link",
          direction: Placement.Left
        }}
        on:click={() => {
          dispatch("saved");
        }}
      >
        <Icon icon="check-circle" class="fill-fgs2" />
      </button>
    {:else}
      <button
        on:click={() => {
          dispatch("save");
        }}
        use:tooltip={{
          text: `**Save ${enumToString(contentType)}** (Cmd/Ctrl + J)`,
          direction: Placement.Left
        }}
        class="p-1 hover:bg-bgs2 rounded-md flex justify-center items-center"
      >
        <Icon icon="ph:plus-circle-light" class="text-fgs2" />
      </button>
    {/if}
  {:else if $syncStore.id}
    <!-- <Button
      icon="sync"
      tooltip="Sync"
      {...buttonParams}
      on:click={() => {
        syncStore.togglePane();
      }}
    /> -->
    <Toggle
      icon="sync"
      tooltip="Sync"
      size={Size.sm}
      bind:on={$syncStore.isShowSyncPane}
      {tooltipOptions}
    />
  {/if}
  <Toggle
    icon="ph:crop-light"
    tooltip="**Snip** (Cmd/Ctrl + Shift + I)"
    bgSize={Size.sm}
    bind:on={isSnipActive}
    {tooltipOptions}
    on:change={() => resetAll("snip")}
  />
  {#if !isScreenShotOnly && !isSaveOnly}
    <!-- TODO - enable this when generate summary is implemented -->
    <!-- <Button
      icon="document-text"
      tooltip="Generate summary"
      {...buttonParams}
      on:click={() => {
        dispatch("summarize");
      }}
    /> -->
    <div
      class={cn("flex gap-3 items-center", {
        "flex-col w-full":
          $toolbarState.position === Placement.Right ||
          $toolbarState.position === Placement.Left,
        "flex-row h-full": $toolbarState.position === Placement.Bottom
      })}
    >
      <Divider
        orientation={$toolbarState.position === Placement.Bottom
          ? Orientation.Vertical
          : Orientation.Horizontal}
      />
      <Toggle
        icon="ph:highlighter-light"
        tooltip="Auto highlighter"
        bgSize={Size.sm}
        bind:on={isAutoHighlighterExpanded}
        {tooltipOptions}
        on:change={toggleAutoHighligher}
      />
      {#if isAutoHighlighterExpanded}
        <div
          class={cn("flex gap-3 items-center justify-center", {
            "flex-col w-full":
              $toolbarState.position === Placement.Right ||
              $toolbarState.position === Placement.Left,
            "flex-row h-full": $toolbarState.position === Placement.Bottom
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
        orientation={$toolbarState.position === Placement.Bottom
          ? Orientation.Vertical
          : Orientation.Horizontal}
      />
    </div>
  {/if}
  {#if isSidePanelAvailable && !isSidePanelOpen}
    <Button
      icon="hugeicons:sidebar-right"
      tooltip="Open Side panel"
      {...buttonParams}
      on:click={() =>
        relayToBackgroundScript({
          event: ExtensionEvent.RUN,
          data: { action: ExtensionEvent.TOGGLE_SIDEPANEL }
        })}
    />
  {/if}
  <!-- <Button
    icon="ph:minus-circle-light"
    tooltip="Collapse"
    {...buttonParams}
    on:click={() => {
      dispatch("collapse");
    }}
  /> -->
  <!-- <div
    class={cn("flex", {
      "flex-col gap-2":
        $toolbarState.position === Placement.Right ||
        $toolbarState.position === Placement.Left
    })}
  > -->
  <button
    on:click={() => {
      dispatch("collapse");
    }}
    use:tooltip={{
      text: "**Minimize toolbar** (Alt + M)",
      direction: Placement.Left
    }}
    class="p-1 hover:bg-bgs2 rounded-md flex justify-center items-center"
  >
    <Icon icon="ph:minus-circle-light" class="text-ass1" />
  </button>
  <button
    on:click={() => {
      dispatch("close");
    }}
    use:tooltip={{
      text: "**Hide toolbar** (Alt + X)",
      direction: Placement.Left
    }}
    class="p-1 hover:bg-bgs2 rounded-md flex justify-center items-center"
  >
    <Icon icon="ph:x-circle-light" class="text-ars1" />
  </button>
  <button
    use:tooltip={{
      disabled: isDragging,
      text: "Drag to move toolbar",
      direction: Placement.Left
    }}
    class="flex justify-center items-center"
  >
    <Icon icon={isHovering ? "ph:dots-six" : "ph:dots-six-light"} />
  </button>
</button>

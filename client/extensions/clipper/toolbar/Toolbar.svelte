<script lang="ts">
  import { createEventDispatcher } from "svelte";
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
  const dispatch = createEventDispatcher();
  export let activeHighlighter: string | null = null;
  export let isSnipActive: boolean = false;
  export let contentType: NodeType = NodeType.WEB_PAGE;

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
  function toggleAutoHighligher() {
    if (!isAutoHighlighterExpanded) {
      activeHighlighter = null;
      dispatch("color", 0);
    } else {
      resetAll("highlighter");
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
</script>

<div
  class={cn(
    "fixed bg-bgs1 border border-brs3 rounded-full min-h-fit flex gap-3  justify-center items-center shadow-md",
    {
      "right-0 top-1/2 flex-col w-11 2k:w-12 mr-4 2k:mr-6 py-3 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Placement.Right || !$toolbarState.position,
      "bottom-0 right-1/2 transform translate-x-1/2 flex-row py-2 mb-4 px-6":
        $toolbarState.position === Placement.Bottom
    }
  )}
>
  {#if !isScreenShotOnly && !$syncStore.id}
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
    tooltip="Snip"
    size={Size.md}
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
      class={cn("flex gap-2 items-center", {
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
        tooltip="Highlighter"
        size={Size.md}
        bind:on={isAutoHighlighterExpanded}
        {tooltipOptions}
        on:change={toggleAutoHighligher}
      />
      {#if isAutoHighlighterExpanded}
        <div
          class={cn("flex gap-2 items-center justify-center", {
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
  <Button
    icon="ph:bookmarks-light"
    tooltip="Open Side panel"
    {...buttonParams}
    on:click={() =>
      relayToBackgroundScript({
        event: ExtensionEvent.RUN,
        data: { action: ExtensionEvent.TOGGLE_SIDEPANEL }
      })}
  />
  <!-- <Button
    icon={$toolbarState.position === Placement.Right
      ? "ph:arrow-elbow-down-left"
      : "ph:arrow-elbow-right-up"}
    tooltip={$toolbarState.position === Placement.Right
      ? "Move to bottom"
      : "Move to right"}
    {...buttonParams}
    on:click={() => {
      let val;
      if ($toolbarState.position === Placement.Right) {
        val = Placement.Bottom;
      } else if (
        $toolbarState.position === Placement.Bottom ||
        !$toolbarState.position
      ) {
        val = Placement.Right;
      }
      toolbarState.changePosition(val);
    }}
  /> -->
  <Button
    icon="ph:x-circle-light"
    tooltip="Collapse"
    {...buttonParams}
    on:click={() => {
      dispatch("collapse");
    }}
  />
</div>

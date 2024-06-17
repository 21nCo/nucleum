<script lang="ts">
  import {
    SessionCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { getTotalsFromComposition } from "$lib/client/products/pointron/pointron.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import PresetDurationText from "./PresetDurationText.svelte";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  const dispatch = createEventDispatcher();
  export let preset: SessionComposition;
  export let isActive: boolean = false;
  export let parentBackgroundIndex = 1;
  export let isExpandedVariant: boolean = false;
  export let isInEditMode: boolean = false;
  let isHovering: boolean = false;
  $: totals = getTotalsFromComposition({ composition: preset });
  function handleClick() {
    dispatch("click", { preset });
  }
  function deleteHandler(event: any) {
    if (preset && preset.id) pointronPreferences.removePreset(preset.id);
    event.stopPropagation();
  }
</script>

{#if preset.focusDuration}
  <ActiveBackgroundElement
    bind:isHovering
    isBackgroundActive={isActive}
    bgWhenInactive={parentBackgroundIndex + 1}
    class={cn(
      "relative flex items-center gap-1 justify-between px-2 2k:px-3 py-4 rounded-md border border-brs2 hover:bg-bgs3",
      {
        "w-full max-w-md": isExpandedVariant,
        "w-36 min-w-[9rem] h-10": !isExpandedVariant
      }
    )}
    on:click={handleClick}
  >
    <span class="flex gap-1 w-1/3 dp:w-1/2 h-full">
      <Icon
        icon={preset.type === SessionCompositionType.POMODORO
          ? "pomodoro"
          : preset.type === SessionCompositionType.TARGET_FOCUS
            ? "bolt"
            : "clock"}
        size={isExpandedVariant ? Size.md : Size.sm}
        {isActive}
        bgColorHue={-1}
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
      />
      <span
        class={cn("text-left truncate", {
          "text-b2": isExpandedVariant,
          "text-b3": !isExpandedVariant
        })}
      >
        {#if preset.name}
          <TextWithHoverTooltip text={preset.name} class="truncate text-left" />
        {:else}
          {formatSeconds(totals.duration)}
        {/if}
      </span>
    </span>
    <span class="flex w-2/3 dp:w-1/2 justify-end items-center h-full">
      <PresetDurationText
        {preset}
        {isExpandedVariant}
        parentBackgroundIndex={parentBackgroundIndex + 1}
        {isActive}
      />
    </span>

    {#if isInEditMode && isExpandedVariant && isHovering}
      <span
        class="absolute right-0 h-full flex items-center bg-gradient-to-l from-bgs3 via-bgs3 to-transparent pr-3 pl-10 rounded-md"
      >
        <Button icon="trash" on:click={deleteHandler} tooltip="Delete preset" />
      </span>
    {/if}
  </ActiveBackgroundElement>
{/if}

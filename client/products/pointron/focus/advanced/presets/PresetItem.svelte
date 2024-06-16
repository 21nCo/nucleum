<script lang="ts">
  import {
    SessionCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import { padToTwo } from "$lib/client/utils/utils";
  import { createEventDispatcher } from "svelte";
  import SwitchItem from "$lib/client/elements/switcher/SwitchItem.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { getTotalsFromComposition } from "$lib/client/products/pointron/pointron.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import PresetDurationText from "./PresetDurationText.svelte";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
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
    class={cn("relative px-2 py-1 rounded-md hover:bg-bgs3", {
      "w-full max-w-md": isExpandedVariant,
      "w-36 min-w-[9rem]": !isExpandedVariant
    })}
    on:click={handleClick}
  >
    <div
      class={cn("flex items-center justify-between gap-2 w-full", {
        "h-12": isExpandedVariant,
        "h-10": !isExpandedVariant
      })}
    >
      <div class="flex w-full gap-1">
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
        <div
          class="flex w-full {isExpandedVariant
            ? 'justify-between items-center'
            : 'flex-col'}"
        >
          {#if preset.name}
            <div
              class="{isExpandedVariant
                ? 'text-b2'
                : 'text-b3'} font-medium w-24 truncate"
            >
              {preset.name}
            </div>
          {:else}
            <div>
              {formatSeconds(totals.duration)}
            </div>
          {/if}
          <PresetDurationText
            {preset}
            {isExpandedVariant}
            parentBackgroundIndex={parentBackgroundIndex + 1}
            {isActive}
          />
        </div>
      </div>
      {#if isInEditMode && isExpandedVariant && isHovering}
        <span class="absolute right-0 h-full flex items-center">
          <Icon
            icon="trash"
            size={Size.sm}
            {isActive}
            on:click={deleteHandler}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
          />
        </span>
      {/if}
    </div>
  </ActiveBackgroundElement>
{/if}

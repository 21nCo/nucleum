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
  const dispatch = createEventDispatcher();
  export let preset: SessionComposition;
  export let isActive: boolean = false;
  export let parentBackgroundIndex = 1;
  export let isExpandedVariant: boolean = false;
  export let isInEditMode: boolean = false;
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
  <div class={isExpandedVariant ? "w-full max-w-md" : "w-36 min-w-[9rem]"}>
    <SwitchItem
      size={Size.md}
      selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
      {parentBackgroundIndex}
      {isActive}
      on:click={handleClick}
      width="w-full"
    >
      <div
        class="flex items-center justify-between gap-2 w-full {isExpandedVariant
          ? 'h-12'
          : 'h-10'}"
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
                class="{isExpandedVariant ? 'text-b2' : 'text-b3'} font-medium"
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
        {#if isInEditMode && isExpandedVariant}
          <Icon
            icon="trash"
            size={Size.sm}
            {isActive}
            on:click={deleteHandler}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
          />
        {/if}
      </div>
    </SwitchItem>
  </div>
{/if}

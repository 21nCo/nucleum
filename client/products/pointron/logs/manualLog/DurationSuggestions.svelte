<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { abg, cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import { TimeFormat } from "@21n/types/time.type";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { appStore } from "@21n/stores/app.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  const dispatch = createEventDispatcher();
  export let selectedItem: number = 0;
  onMount(() => {
    if (
      !$pointronPreferences.manualEntryQuickDurations ||
      $pointronPreferences.manualEntryQuickDurations.length === 0
    ) {
      pointronPreferences.setSeedManualEntryQuickDurations();
    }
  });
</script>

{#if $pointronPreferences?.manualEntryQuickDurations && $pointronPreferences.manualEntryQuickDurations.length > 0}
  <div class="flex-col items-start flex w-full gap-2">
    <div class="flex items-center gap-2 w-full">
      <FormControlLabel props={{ label: "Choose quick duration" }} />
      -
      <Button
        label="edit"
        style={ButtonStyle.PLAIN}
        size={Size.xs}
        isUnderlined={true}
        on:click={() => {
          appStore.runAction(PointronAction.SESSION_SETTINGS_MODAL);
        }}
      />
    </div>
    <div class="w-full grid cw:grid-cols-2 grid-cols-3 dp:grid-cols-4 gap-2">
      {#each $pointronPreferences.manualEntryQuickDurations as item (item)}
        <button
          class={cn(
            "px-4 cw:py-1.5 py-2 rounded-md min-w-fit grow text-b2 border",
            abg(item === selectedItem, 1),
            {
              "border-transparent": item === selectedItem,
              "border-brs2 hover:bg-bgs3": item != selectedItem
            }
          )}
          on:click={() => {
            selectedItem = item;
            uiState.setState(UIState.manualLogQuickDuration, item, {
              scope: UIStateScope.DEVICE
            });
            dispatch("select", item);
          }}
        >
          last {formatSeconds(item * 60, TimeFormat.VERBOSE, {
            verboseTextSize: Size.md
          })}
        </button>
      {/each}
    </div>
  </div>
{/if}

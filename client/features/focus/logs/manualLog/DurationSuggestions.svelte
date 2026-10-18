<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { pointronPreferences } from "@nucleum/features/focus/preferences.store";
  import FormControlLabel from "@21n/ui/elements/text/formLabel/FormControlLabel.svelte";
  import { formatSeconds } from "@21n/ui/elements/time/duration-format";
  import { onMount } from "svelte";
  import { abg, cn } from "@21n/ui/environment/presentation";
  import { Size } from "@21n/ui/elements/size.enum";
  import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";

  import { PointronAction } from "@nucleum/client/config/focus-action.enum";
  let {
    selectedItem = $bindable(0),
    onSelect = undefined
  }: {
    selectedItem?: number;
    onSelect?: ((event: CustomEvent<number>) => void) | undefined;
  } = $props();

  function emitSelect(item: number) {
    const selectEvent = new CustomEvent<number>("select", {
      detail: item
    });
    onSelect?.(selectEvent);
  }

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
        onclick={() => {
          requireCommandHost().runAction(PointronAction.SESSION_SETTINGS_MODAL);
        }}
      />
    </div>
    <div class="w-full grid cw:grid-cols-2 grid-cols-3 dp:grid-cols-4 gap-2">
      {#each $pointronPreferences.manualEntryQuickDurations as item, index (`${item}-${index}`)}
        <button
          class={cn(
            "px-4 cw:py-1.5 py-2 rounded-md min-w-fit grow text-b2 border",
            abg(item === selectedItem, 1),
            {
              "border-transparent": item === selectedItem,
              "border-brs2 hover:bg-bgs3": item != selectedItem
            }
          )}
          onclick={() => {
            selectedItem = item;
            uiState.setState(UIState.manualLogQuickDuration, item, {
              scope: UIStateScope.DEVICE
            });
            emitSelect(item);
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

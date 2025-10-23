<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import QuickAddDurationsEditor from "@21n/products/pointron/logs/manualLog/QuickAddDurationsEditor.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import context from "@21n/stores/context.store";

  if (!$pointronPreferences.manualEntryQuickDurations) {
    pointronPreferences.setSeedManualEntryQuickDurations();
  }

  function onManualEntryQuickDurationsChange(event: CustomEvent) {
    if (!event.detail.values) return;
    pointronPreferences.updateManualEntryQuickDurations(event.detail.values);
  }
</script>

<div class="flex flex-col gap-4 w-full">
  <!-- <div>
    <DurationInput
      label={{
        label: "Extend duration",
        tooltip: {
          body: "The default duration to extend the session, when you use dynamic duration."
        },
        orientation: Orientation.Vertical
      }}
      bind:value={$userLocalPreferences.extendDuration}
    />
  </div> -->
  <QuickAddDurationsEditor
    values={$pointronPreferences.manualEntryQuickDurations}
    on:change={onManualEntryQuickDurationsChange}
  />
  <div>
    <DurationInput
      label={{
        label: "Default break reminder",
        tooltip: {
          body: "The maximum duration of an interval after which you will be notified to take a break. This does not apply if you start focus using presets"
        },
        orientation: Orientation.Vertical
      }}
      bind:value={$pointronPreferences.breakReminder}
    />
  </div>
  {#if !$context.isEmbed}
    <SwitchInput
      label={{
        label: "Automatically activate Picture-in-Picture (PiP) on focus start",
        tooltip: {
          body: "When enabled, the PiP will be automatically activated when a focus session starts. Note: PiP is currently only available on web app."
        }
      }}
      bind:checked={$pointronPreferences.isEnableAutoPiP}
      isExpanded={true}
    />
  {/if}
</div>

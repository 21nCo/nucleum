<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import QuickAddDurationsEditor from "$lib/client/products/pointron/logs/manualLog/QuickAddDurationsEditor.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";

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
  <div>
    <DurationInput
      label={{
        label: "Default break reminder",
        tooltip: {
          body: "The maximum duration of an interval after which you will be notified to take a break. This does not apply if you start session using presets"
        },
        orientation: Orientation.Vertical
      }}
      bind:value={$pointronPreferences.breakReminder}
    />
  </div>

  <QuickAddDurationsEditor
    values={$pointronPreferences.manualEntryQuickDurations}
    on:change={onManualEntryQuickDurationsChange}
  />
</div>

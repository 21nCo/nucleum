<script lang="ts">
  import PresetsEditor from "$lib/pointron/presets/PresetsEditor.svelte";
  import { userLocalPreferences } from "$lib/pointron/stores/pointron.store";
  import CheckboxInput from "$lib/tidy/elements/CheckboxInput.svelte";
  import TextInput from "$lib/tidy/elements/TextInput.svelte";
</script>

<TextInput
  bind:value={$userLocalPreferences.extendDuration}
  label="Extend duration"
  units={["minutes"]}
/>
<div class="flex flex-col gap-1">
  <div class="text-fgs2">Interval Presets</div>
  <div>
    <PresetsEditor />
  </div>
</div>
<CheckboxInput
  label="Enable auto start interval"
  bind:checked={$userLocalPreferences.isEnableAutoStartInterval}
/>

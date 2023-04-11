<script lang="ts">
    import PresetsEditor from "$lib/presets/PresetsEditor.svelte";
    import CheckboxInput from "$lib/tidy/shared/elements/CheckboxInput.svelte";
    import TextInput from "$lib/tidy/shared/elements/TextInput.svelte";
    import { userPreferences } from "$lib/tidy/stores/stores";
</script>

<TextInput
    bind:value={$userPreferences.extendDuration}
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
    bind:checked={$userPreferences.isEnableAutoStartInterval}
/>

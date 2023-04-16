<script lang="ts">
    import TimeSelector from "$lib/tidy/shared/TimeSelector.svelte";
    import CheckboxInput from "$lib/tidy/elements/CheckboxInput.svelte";
    import TextInput from "$lib/tidy/elements/TextInput.svelte";
    import { onMount } from "svelte";
    import { userPreferences } from "$lib/tidy/stores/stores";
    export let selectedHour: any = "00";
    export let selectedMinute = "00";
    onMount(() => {
        if ($userPreferences.dayStart) {
            let parts = $userPreferences.dayStart?.split(":");
            selectedHour = parts[0];
            selectedMinute = parts[1];
        }
    });
    function onChange(event: any) {
        userPreferences.updateDayStart(event.detail.value);
    }
</script>

<CheckboxInput
    label="Enable Daily Target"
    bind:checked={$userPreferences.isEnableDailyTarget}
/>
{#if $userPreferences.isEnableDailyTarget}
    <TextInput
        bind:value={$userPreferences.dailyFocusTarget}
        units={["hours"]}
        label="Daily focus target"
    />
    <TimeSelector
        label="Day starts at"
        {selectedHour}
        {selectedMinute}
        on:change={onChange}
    />
{/if}

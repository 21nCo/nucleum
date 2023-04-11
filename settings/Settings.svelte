<script lang="ts">
    import { appEvents, windowObject } from "$lib/tidy/stores/stores";
    import { onMount } from "svelte";
    import AppearanceSettings from "./AppearanceSettings.svelte";
    import DailyTargetSettings from "./DailyTargetSettings.svelte";
    import SessionSettings from "./SessionSettings.svelte";
    import StorageSettings from "./StorageSettings.svelte";
    import AboutSettings from "./AboutSettings.svelte";
    import { EventType } from "$lib/tidy/types/event.enum";
    export let menuItems: any;
    export let selectedMenuIndex: number = 0;
    onMount(() => {
        windowObject.toggleTopBar(true);
        appEvents.notify(EventType.SHOW_APPEARANCE_PREVIEW, false);
    });
</script>

<div class="flex flex-col gap-4 w-full h-full overflow-y-auto p-4">
    <div class="text-h1 pb-10 pt-2 item-start text-accent1">
        {menuItems[selectedMenuIndex]}
    </div>
    {#if selectedMenuIndex == 0}
        <AppearanceSettings />
    {:else if selectedMenuIndex == 1}
        <SessionSettings />
    {:else if selectedMenuIndex == 2}
        <DailyTargetSettings />
    {:else if selectedMenuIndex == 3}
        <StorageSettings />
    {:else if selectedMenuIndex == 4}
        <AboutSettings />
    {/if}
</div>

<!-- <a href="/" class="text-fgs2" on:click={onGoback}> go back </a> -->

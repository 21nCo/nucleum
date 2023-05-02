<script lang="ts">
    import Notifications from "$lib/tidy/shared/Notifications.svelte";
    import { EventType } from "$lib/tidy/types/event.enum";
    import { onMount, tick } from "svelte";
    import {
        appEvents,
        appStore,
        currentTime,
        userPreferences,
    } from "$lib/tidy/stores/stores";
    import type { CustomEvent } from "$lib/tidy/types/event.type";
    import Popover from "$lib/tidy/shared/Popover/Popover.svelte";
    import { Size } from "$lib/tidy/types/size.enum";
    import AppearanceSettings from "$lib/tidy/settings/AppearanceSettings.svelte";
    import DebugLayer from "./DebugLayer.svelte";
    import ThemeLayer from "./ThemeLayer.svelte";
    let isShowAppearancePopover: boolean = false;
    let environment: string;
    let timer: any;
    onMount(() => {
        appEvents.subscribe((x: CustomEvent) => {
            if (x.type == EventType.SHOW_APPEARANCE_PREVIEW) {
                isShowAppearancePopover = x.value ?? false;
            }
        });
        if ($appStore.environment) {
            if ($appStore.environment == "pre") environment = "Preview";
            else if ($appStore.environment == "dev") environment = "Dev";
        }
        clearInterval(timer);
        timer = setInterval(() => {
            tick();
            $currentTime = new Date();
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    });
</script>

<title>{$appStore.appName}</title>
<div class="flex h-screen w-screen">
    <ThemeLayer>
        <slot />
    </ThemeLayer>
</div>
{#if $appStore.isDebug}
    <DebugLayer />
{/if}
{#if environment}
    <div
        class="absolute right-0 top-20 text-bgs1 z-10 w-20 px-2 bg-accent1 opacity-50"
    >
        {environment}
    </div>
{/if}
<Popover
    size={Size.xl}
    bind:show={isShowAppearancePopover}
    isOnRight={true}
    isShowOverlay={false}
    title={"Appearance"}
>
    <div class="flex flex-col gap-4">
        <AppearanceSettings parentBackgroundIndex={2} isInPreviewMode={true} />
    </div>
</Popover>
<Notifications />

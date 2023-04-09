<script lang="ts">
    import SettingsButton from "$lib/topBar/SettingsButton.svelte";
    import TopBar from "$lib/topBar/TopBar.svelte";
    import { AppMode } from "$lib/tidy/types/appMode.enum";
    import { EventType } from "$lib/tidy/types/event.enum";
    import { onMount } from "svelte";
    import {
        appEvents,
        userPreferences,
        windowObject,
    } from "$lib/tidy/stores/stores";
    import type { CustomEvent } from "$lib/tidy/types/event.type";
    import Popover from "$lib/tidy/shared/Popover/Popover.svelte";
    import { Size } from "$lib/tidy/types/size.enum";
    import AppearanceSettings from "$lib/tidy/settings/AppearanceSettings.svelte";
    let pad: number;
    let isShowAppearancePopover: boolean = false;
    $: if ($windowObject.aspectRatio) {
        if ($windowObject.aspectRatio >= 3) {
            pad = 10;
        } else if ($windowObject.aspectRatio >= 2) {
            pad = 20;
        } else {
            if ($windowObject.scale >= 2) {
                pad = 120;
            } else if ($windowObject.scale >= 1.5) {
                pad = 80;
            } else if ($windowObject.scale >= 1) {
                pad = 60;
            } else if ($windowObject.scale >= 0.5) {
                pad = 50;
            } else {
                pad = 40;
            }
        }
    }
    onMount(() => {
        appEvents.subscribe((x: CustomEvent) => {
            if (x.type == EventType.SHOW_APPEARANCE_PREVIEW) {
                isShowAppearancePopover = x.value ?? false;
            }
        });
    });
</script>

{#if $userPreferences.appMode == AppMode.MINIMAL}
    <div
        class="flex flex-col h-full justify-center items-center"
        style="padding-top: {pad}px; padding-bottom: {pad}px"
    >
        <div class="px-5 lg:px-36 w-full">
            <TopBar />
        </div>
        <div class="grow" />
        <slot />
    </div>
{:else}
    <div class="flex justify-center h-full w-full items-center">
        <div class="flex h-full w-full">
            <div
                class="bg-bgs2 max-w-md lg:max-w-lg flex flex-col items-center w-full px-4 gap-4 rounded-xl m-2"
                style="padding-top: {pad}px; height: calc(100% - 1rem);"
            >
                <div class="flex w-full px-4 pb-10">
                    <TopBar />
                </div>
                <slot name="sidepanel" />
            </div>
            <div
                class="flex justify-center items-center w-full p-4"
                style="padding-top: {pad}px; padding-bottom: {pad}px;"
            >
                <slot name="main" />
            </div>
        </div>
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

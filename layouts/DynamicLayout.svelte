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
    import PageSwitcher from "../shared/elements/pageSwitcher/PageSwitcher.svelte";
    let pad: number;
    let isShowAppearancePopover: boolean = false;
    $: if ($windowObject.documentHeight) {
        let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
        pad = rawPad > 200 ? 200 : rawPad;
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
                class="relative bg-bgs2 max-w-md lg:max-w-lg flex flex-col items-center w-full px-4 gap-4 rounded-xl m-2"
                style="padding-top: {pad / 2}px; padding-bottom: {pad /
                    2}px; height: calc(100% - 1rem);"
            >
                <!-- <div class="flex w-full px-4 pb-10">
                    <TopBar />
                </div> -->
                <slot name="sidepanel" />
                <div
                    class="absolute bottom-2 left-0 flex justify-center w-full"
                >
                    <PageSwitcher parentBackgroundIndex={2} />
                </div>
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

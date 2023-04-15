<script lang="ts">
    import Notifications from "$lib/tidy/shared/Notifications.svelte";
    import { EventType } from "$lib/tidy/types/event.enum";
    import { onMount } from "svelte";
    import {
        appEvents,
        appStore,
        userPreferences,
        windowObject,
    } from "$lib/tidy/stores/stores";
    import type { CustomEvent } from "$lib/tidy/types/event.type";
    import Popover from "$lib/tidy/shared/Popover/Popover.svelte";
    import { Size } from "$lib/tidy/types/size.enum";
    import AppearanceSettings from "$lib/tidy/settings/AppearanceSettings.svelte";
    import PowerPanel from "$lib/tidy/components/powerPanel/PowerPanel.svelte";
    let isShowAppearancePopover: boolean = false;
    let scaleClass: string = "default";
    let fontFamily: string = "Avenir";
    function handleResize() {
        windowObject.updateDoumentDimensions(
            window.innerWidth,
            window.innerHeight
        );
    }
    onMount(() => {
        appEvents.subscribe((x: CustomEvent) => {
            if (x.type == EventType.SHOW_APPEARANCE_PREVIEW) {
                isShowAppearancePopover = x.value ?? false;
            }
        });
        bootup();
        window.addEventListener("resize", handleResize);
        userPreferences.subscribe((userPreferences: any) => {
            refreshTailwind();
        });
        windowObject.subscribe((windowObject: any) => {
            refreshSizing();
            refreshTailwind();
        });
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });
    function bootup() {
        handleResize();
        refreshSizing();
        refreshTailwind();
    }
    function refreshSizing() {
        if ($windowObject.scale) {
            if ($windowObject.scale >= 2) {
                scaleClass = "extralarge";
            } else if ($windowObject.scale >= 1.5) {
                scaleClass = "large";
            } else if ($windowObject.scale >= 0.5) {
                scaleClass = "default";
            } else {
                scaleClass = "small";
            }
        }
    }
    function refreshTailwind() {
        fontFamily = $userPreferences.theme === "Clean" ? "Avenir" : "PT Serif";
        $appStore.tailwindTheme = `${
            $userPreferences.theme.toLowerCase() ?? "clean"
        } ${scaleClass} ${$userPreferences.colorScheme?.label ?? "light"}`;
        document.documentElement.style.setProperty(
            "--fontFamily-sans-0",
            fontFamily
        );
    }
</script>

<div class="flex bg-bgs1 h-screen w-screen text-fgs1">
    <PowerPanel />
    <div class="flex overflow-auto scrollstyle h-full w-full">
        <slot />
    </div>
</div>
{#if $appStore.isDebug}
    <div
        class="absolute debug top-0 left-0 flex flex-col p-10 bg-bgs4 bg-opacity-60 text-fgs1 rounded-lg"
    >
        <div>
            {"Dimensions (W x H): " +
                $windowObject.documentWidth +
                "x" +
                $windowObject.documentHeight}}
        </div>
        <div>
            {"Landscapiness: " + $windowObject.landscapiness.toFixed(2)}
        </div>
        <div>
            {"Scale: " + $windowObject.scale.toFixed(2)}
        </div>
        <div>
            {"Theme: " + $appStore.tailwindTheme}
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
<Notifications />

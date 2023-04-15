<script lang="ts">
    import TopBar from "$lib/topBar/TopBar.svelte";
    import { AppMode } from "$lib/tidy/types/appMode.enum";
    import { userPreferences, windowObject } from "$lib/tidy/stores/stores";
    let pad: number;
    $: if ($windowObject.documentHeight) {
        let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
        pad = rawPad > 200 ? 200 : rawPad;
    }
</script>

{#if $userPreferences.appMode == AppMode.MINIMAL}
    <div
        class="flex flex-col w-full h-full justify-center items-center"
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

<script lang="ts">
    import { userPreferences, windowObject } from "$lib/tidy/stores/stores";
    import { LayoutType } from "$lib/tidy/types/layout.enum";
    import Switcher from "../elements/switcher/Switcher.svelte";
    import { SelectionItemActiveStyle } from "../types/switcher.enum";
    export let layoutType: LayoutType = LayoutType.ONEPANEL;
    export let panelTitles: string[] = [];
    let pad: number;
    let selectedPanel: number = 0;
    $: if ($windowObject.documentHeight) {
        let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
        pad = rawPad > 200 ? 200 : rawPad;
    }
</script>

{#if layoutType == LayoutType.ONEPANEL}
    <div
        class="flex flex-col w-full h-full justify-center items-center"
        style="padding-top: {pad}px; padding-bottom: {pad}px"
    >
        <slot />
    </div>
{:else if layoutType == LayoutType.TWOPANEL}
    <div class="flex flex-col w-full">
        {#if $windowObject.isInThinMode}
            <div class="flex w-full justify-center mt-10 text-h2">
                <div>
                    <Switcher
                        items={panelTitles}
                        bind:selected={selectedPanel}
                        selectionStyle={SelectionItemActiveStyle.BOTTOMDOT}
                    />
                </div>
            </div>
        {/if}
        <div class="flex justify-center h-full w-full items-center">
            <div class="flex h-full w-full">
                {#if !$windowObject.isInThinMode}
                    <div
                        class="relative w-2/5 max-w-xl flex flex-col items-center gap-4 rounded-xl m-2 {$userPreferences.theme ==
                        'Colorful'
                            ? 'glasspanel'
                            : 'bg-bgs2'}"
                        style="padding-top: {pad / 4}px; padding-bottom: {pad /
                            4}px; padding-right: {pad /
                            8}px; padding-left: {pad /
                            8}px; height: calc(100% - 1rem);"
                    >
                        <!-- <div class="flex w-full px-4 pb-10">
                <TopBar />
            </div> -->
                        <slot name="sidepanel" />
                    </div>
                    <div
                        class="flex justify-center items-center p-4 w-3/5"
                        style="padding-top: {pad}px; padding-bottom: {pad}px;"
                    >
                        <slot name="main" />
                    </div>
                {:else if selectedPanel == 0}
                    <slot name="sidepanel" />
                {:else if selectedPanel == 1}
                    <slot name="main" />
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .glasspanel {
        background: rgba(6, 8, 49, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(25px);
    }
</style>

<script lang="ts">
    import {
        appEvents,
        appStore,
        userPreferences,
        windowObject,
    } from "$lib/tidy/stores/stores";
    import { LayoutType } from "$lib/tidy/types/layout.enum";
    import { onMount } from "svelte";
    import PageMenuView from "../components/powerPanel/PageMenuView.svelte";
    import Switcher from "../elements/switcher/Switcher.svelte";
    import { SelectionItemActiveStyle } from "../types/switcher.enum";
    import { EventType } from "../types/event.enum";
    import type { CustomEvent } from "../types/event.type";
    import Button from "../elements/Button.svelte";
    import { Size } from "../types/size.enum";
    export let layoutType: LayoutType = LayoutType.ONEPANEL;
    export let panelTitles: string[] = [];
    export let isShowPageMenu: boolean = true;
    let pad: number;
    let selectedPanel: number = 0;
    $: if ($windowObject.documentHeight) {
        let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
        pad = rawPad > 200 ? 200 : rawPad;
    }
    onMount(() => {
        isShowPageMenu = $windowObject.isInThinMode;
        appEvents.subscribe((x: CustomEvent) => {
            if (x.type == EventType.PAGE_MENU_CHANGED) {
                isShowPageMenu = false;
            }
        });
    });
</script>

{#if $appStore.pageMenu && $appStore.pageMenu.length > 0 && isShowPageMenu}
    <div class="flex flex-col h-full justify-center">
        <PageMenuView />
    </div>
{:else}
    {#if $appStore.pageMenu && $appStore.pageMenu.length > 0 && $windowObject.isInThinMode}
        <div style="margin: {pad / 4}px;">
            <Button
                label="go back"
                size={Size.sm}
                on:click={() => {
                    isShowPageMenu = true;
                }}
            />
        </div>
    {/if}
    {#if layoutType == LayoutType.ONEPANEL}
        <div class="w-full h-full" style="margin: {pad / 4}px;">
            <slot />
        </div>
    {:else if layoutType == LayoutType.TWOPANEL}
        {#if $windowObject.isInThinMode}
            <div
                class="flex w-full text-h2"
                style="margin-top: {pad / 4}px; margin-bottom: {pad / 4}px;"
            >
                <div>
                    <Switcher
                        items={panelTitles}
                        bind:selected={selectedPanel}
                        selectionStyle={SelectionItemActiveStyle.BOTTOMDOT}
                    />
                </div>
            </div>
        {/if}
        <div class="flex justify-center w-full items-center overflow-auto">
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
    {/if}
{/if}

<style>
    .glasspanel {
        background: rgba(6, 8, 49, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(25px);
    }
</style>

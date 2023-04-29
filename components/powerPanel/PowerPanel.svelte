<script lang="ts">
    import MenuSwitcher from "$lib/tidy/elements/switcher/Switcher.svelte";
    import PageSwitcher from "$lib/tidy/elements/pageSwitcher/PageSwitcher.svelte";
    import {
        appEvents,
        appStore,
        userPreferences,
        windowObject,
    } from "$lib/tidy/stores/stores";
    import { EventType } from "$lib/tidy/types/event.enum";
    import {
        SelectionItemActiveStyle,
        SwitcherStyle,
    } from "$lib/tidy/types/switcher.enum";
    import { PageSwitcherStyle } from "$lib/tidy/types/pagemenuitem.type";
    import { onMount } from "svelte";
    import { Size } from "$lib/tidy/types/size.enum";
    import Button from "$lib/tidy/elements/Button.svelte";
    let selectedSubMenu: number = 0;
    let isMinimized: boolean = false;
    let headerHeight: number = 150;
    let isHovered: boolean = false;
    function onMinimizeToggled() {
        isMinimized = !isMinimized;
        if (isMinimized) isHovered = false;
    }
    onMount(() => {
        appStore.subscribe((x: any) => {
            if (x && x.powerSubMenu && x.powerSubMenu.length > 0) {
                isMinimized = false;
                selectedSubMenu = 0;
            }
        });
    });
</script>

{#if $windowObject.isInPortrait}
    <div class="absolute bottom-0 flex justify-center z-10 w-full p-4">
        <div class="bg-bgs4 rounded-full">
            <PageSwitcher
                style={PageSwitcherStyle.THIN}
                parentBackgroundIndex={3}
            />
        </div>
    </div>
{:else if isMinimized}
    <div
        class="flex flex-col gap-4 absolute left-1 z-10 {isHovered
            ? 'bg-bgs4 rounded-lg p-2'
            : 'opacity-40'}"
        style="top: {headerHeight}px"
        on:mouseenter={() => (isHovered = true)}
        on:mouseleave={() => (isHovered = false)}
    >
        <PageSwitcher
            {isHovered}
            parentBackgroundIndex={1}
            style={PageSwitcherStyle.MINIMIZED}
        />
        {#if isHovered}
            <Button
                on:click={onMinimizeToggled}
                size={Size.xs}
                label="switch to verbose"
            />
        {/if}
    </div>
{:else}
    <div class="flex justify-center items-center h-full w-56 ml-2">
        <div
            class="flex flex-col py-10 gap-4 items-center justify-between w-full rounded-lg {$userPreferences.theme ==
            'Colorful'
                ? 'glass'
                : 'bg-bgs2'}"
            style="height: calc(100% - 1rem);"
        >
            <div class="w-full flex flex-col gap-4">
                <slot name="header" />
                <div class="flex flex-col gap-20 w-full p-2">
                    <PageSwitcher parentBackgroundIndex={1} />
                    {#if $appStore.powerSubMenu && $appStore.powerSubMenu.length > 0}
                        <div class="pl-4">
                            <MenuSwitcher
                                items={$appStore.powerSubMenu}
                                style={SwitcherStyle.Vertical}
                                selectionStyle={SelectionItemActiveStyle.SIDEDOT}
                                bind:selected={selectedSubMenu}
                                on:switch={() => {
                                    appEvents.notify(
                                        EventType.SUB_MENU_CHANGED,
                                        selectedSubMenu
                                    );
                                }}
                            />
                        </div>
                    {/if}
                </div>
            </div>

            <Button
                on:click={onMinimizeToggled}
                size={Size.xs}
                label="switch to min mode"
            />
        </div>
    </div>
{/if}

<style>
    .glass {
        background: rgba(204, 204, 214, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(25px);
    }
</style>

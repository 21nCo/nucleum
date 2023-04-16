<script lang="ts">
    import MenuSwitcher from "$lib/tidy/elements/switcher/Switcher.svelte";
    import PageSwitcher from "$lib/tidy/elements/pageSwitcher/PageSwitcher.svelte";
    import {
        appEvents,
        appStore,
        userPreferences,
    } from "$lib/tidy/stores/stores";
    import { EventType } from "$lib/tidy/types/event.enum";
    import {
        SelectionItemActiveStyle,
        SwitcherStyle,
    } from "$lib/tidy/types/switcher.enum";
    let selectedSubMenu: number = 0;
</script>

<div class="flex justify-center items-center h-full w-1/6 ml-2">
    <div
        class="flex flex-col py-10 gap-4 items-center w-full rounded-lg {$userPreferences.theme ==
        'Colorful'
            ? 'glass'
            : 'bg-bgs2'}"
        style="height: calc(100% - 1rem);"
    >
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
</div>

<style>
    .glass {
        background: rgba(204, 204, 214, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(25px);
    }
</style>

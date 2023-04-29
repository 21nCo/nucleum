<script lang="ts">
    import MenuSwitcher from "$lib/tidy/elements/switcher/Switcher.svelte";
    import { appEvents, appStore } from "$lib/tidy/stores/stores";
    import type { AppStore } from "$lib/tidy/types/appStore.type";
    import { EventType } from "$lib/tidy/types/event.enum";
    import {
        SelectionItemActiveStyle,
        SwitcherStyle,
    } from "$lib/tidy/types/switcher.enum";
    import { onMount } from "svelte";
    let selected: number = 0;
    onMount(() => {
        appStore.subscribe((x: AppStore) => {
            if (x && x.pageMenu && x.pageMenu.length > 0) {
                selected = 0;
            }
        });
    });
</script>

{#if $appStore.pageMenu && $appStore.pageMenu.length > 0}
    <div class="pl-4">
        <MenuSwitcher
            items={$appStore.pageMenu.map((t) => t.label)}
            style={SwitcherStyle.Vertical}
            selectionStyle={SelectionItemActiveStyle.SIDEDOT}
            bind:selected
            on:switch={() => {
                appEvents.notify(EventType.PAGE_MENU_CHANGED, selected);
            }}
        />
    </div>
{/if}

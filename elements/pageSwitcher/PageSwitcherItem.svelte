<script lang="ts">
    import RiveAnimatedIcon from "$lib/tidy/icons/RiveAnimatedIcon.svelte";
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    import { createEventDispatcher } from "svelte";
    import Element from "../Element.svelte";
    import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
    const dispatch = createEventDispatcher();
    export let item: PageMenuItem;
    export let isActive: boolean = false;
    let rive: any;
    function onClick() {
        rive?.fire();
        dispatch("click", {});
    }
    function onHover() {
        rive?.fire();
    }
</script>

<Element
    classList="flex gap-2 items-center rounded-lg px-6 h-12"
    {isActive}
    on:click={onClick}
    on:pointerenter={onHover}
    selectionStyle={SelectionItemActiveStyle.ACCENT}
>
    {#if item.icon}
        <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} />
    {/if}
    {item.label}
</Element>

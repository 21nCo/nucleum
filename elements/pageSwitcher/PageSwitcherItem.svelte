<script lang="ts">
    import {
        PageSwitcherStyle,
        type PageMenuItem,
    } from "$lib/tidy/types/pagemenuitem.type";
    import { createEventDispatcher } from "svelte";
    import Element from "../Element.svelte";
    import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
    import Icon from "$lib/tidy/icons/Icon.svelte";
    const dispatch = createEventDispatcher();
    export let item: PageMenuItem;
    export let style: PageSwitcherStyle = PageSwitcherStyle.DEFAULT;
    export let isActive: boolean = false;
    export let isShowLabel: boolean = true;
    export let parentBackgroundIndex: number;
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
    classList="flex gap-2 items-center {isShowLabel
        ? style === PageSwitcherStyle.THIN
            ? ' rounded-full px-6 h-12'
            : 'rounded-lg px-6 h-12'
        : 'p-4 rounded-full'}"
    {isActive}  
    on:click={onClick}
    on:pointerenter={onHover}
    {parentBackgroundIndex}
    selectionStyle={SelectionItemActiveStyle.ACCENT}
>
    {#if item.icon}
        <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
        <Icon icon={item.icon} {isActive} />
    {/if}
    {#if isShowLabel}
        {item.label}
    {/if}
</Element>

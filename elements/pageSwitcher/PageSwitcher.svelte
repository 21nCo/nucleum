<script lang="ts">
    import {
        PageSwitcherStyle,
        type PageMenuItem,
    } from "$lib/tidy/types/pagemenuitem.type";
    import { onMount } from "svelte";
    import PageSwitcherItem from "./PageSwitcherItem.svelte";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    import { goto } from "$app/navigation";

    export let items: PageMenuItem[] = [
        { label: "point", path: "/", icon: "point" },
        { label: "flow", path: "/flow", icon: "flow" },
        { label: "control", path: "/control", icon: "control" },
    ];
    export let style: PageSwitcherStyle = PageSwitcherStyle.DEFAULT;
    export let parentBackgroundIndex: number;
    export let isHovered: boolean = false;
    let backgroundColor: string;
    let selected: number;
    onMount(() => {
        let currentPath = window.location.pathname;
        let currentPage = items.find((item) => item.path === currentPath);
        selected = currentPage ? items.indexOf(currentPage) : 0;
        let colors = generateBackgroudColor(parentBackgroundIndex);
        backgroundColor = colors.backgroundColor;
    });
</script>

<div
    class="flex {style === PageSwitcherStyle.THIN
        ? 'rounded-full'
        : 'flex-col rounded-lg'} min-w-min w-full"
>
    {#each items as item, index}
        {#if style != PageSwitcherStyle.MINIMIZED || (style === PageSwitcherStyle.MINIMIZED && (isHovered || selected == index))}
            <PageSwitcherItem
                {parentBackgroundIndex}
                {style}
                isShowLabel={(style === PageSwitcherStyle.MINIMIZED &&
                    isHovered) ||
                    style != PageSwitcherStyle.MINIMIZED}
                on:click={() => {
                    selected = index;
                    goto(item.path);
                }}
                {item}
                isActive={selected == index}
            />
        {/if}
    {/each}
</div>

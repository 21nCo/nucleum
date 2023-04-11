<script lang="ts">
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    import { onMount } from "svelte";
    import PageSwitcherItem from "./PageSwitcherItem.svelte";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    import { goto } from "$app/navigation";

    export let items: PageMenuItem[] = [
        { label: "now", path: "/" },
        { label: "flow", path: "/flow" },
        { label: "control", path: "/control" },
    ];
    export let parentBackgroundIndex: number;
    let activeBackgroundColor: string;
    let backgroundColor: string;
    let selected: number;
    onMount(() => {
        let currentPath = window.location.pathname;
        let currentPage = items.find((item) => item.path === currentPath);
        selected = currentPage ? items.indexOf(currentPage) : 0;
        let colors = generateBackgroudColor(parentBackgroundIndex);
        activeBackgroundColor = colors.activeBackgroundColor;
        backgroundColor = colors.backgroundColor;
    });
</script>

<div class="flex min-w-min rounded-full h-10 {backgroundColor}">
    {#each items as item, index}
        <PageSwitcherItem
            on:click={() => {
                selected = index;
                goto(item.path);
            }}
            {item}
            {activeBackgroundColor}
            isActive={selected == index}
        />
    {/each}
</div>

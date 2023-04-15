<script lang="ts">
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    import { onMount } from "svelte";
    import PageSwitcherItem from "./PageSwitcherItem.svelte";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    import { goto } from "$app/navigation";

    export let items: PageMenuItem[] = [
        { label: "now", path: "/" },
        { label: "flow", path: "/flow", icon: "bars5" },
        { label: "control", path: "/control" },
    ];
    export let parentBackgroundIndex: number;

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

<div class="flex flex-col min-w-min w-full rounded-lg {backgroundColor}">
    {#each items as item, index}
        <PageSwitcherItem
            on:click={() => {
                selected = index;
                goto(item.path);
            }}
            {item}
            isActive={selected == index}
        />
    {/each}
</div>

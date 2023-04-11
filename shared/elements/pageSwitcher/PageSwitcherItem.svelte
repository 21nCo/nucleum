<script lang="ts">
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    import { onMount } from "svelte";
    export let item: PageMenuItem;
    export let activeBackgroundColor: string;
    export let isActive: boolean = false;
</script>

<button
    on:click
    class="flex gap-2 items-center rounded-full px-6 {isActive
        ? activeBackgroundColor
        : ''}"
>
    {item.label}
</button>

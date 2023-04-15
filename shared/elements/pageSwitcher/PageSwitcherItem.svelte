<script lang="ts">
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    export let item: PageMenuItem;
    export let isActive: boolean = false;
</script>

<button
    on:click
    class="flex gap-2 items-center rounded-lg px-6 h-12 {isActive
        ? 'bg-accent1 text-bgs2'
        : ''}"
>
    {item.label}
</button>

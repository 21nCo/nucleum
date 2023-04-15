<script lang="ts">
    import RiveAnimatedIcon from "$lib/tidy/icons/RiveAnimatedIcon.svelte";
    import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
    import { createEventDispatcher } from "svelte";
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

<button
    on:click={onClick}
    on:pointerenter={onHover}
    class="flex gap-2 items-center rounded-lg px-6 h-12 {isActive
        ? 'bg-accent1 text-bgs2'
        : ''}"
>
    {#if item.icon}
        <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} />
    {/if}
    {item.label}
</button>

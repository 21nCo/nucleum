<script lang="ts">
    import Control from "./Control.svelte";
    import Flow from "./Flow.svelte";
    import Point from "./Point.svelte";
    export let icon: string | undefined = undefined;
    export let isActive: boolean = false;
    $: {
        if (isActive) {
            fg = initialBackground;
            bg = initialForeground;
        } else {
            fg = initialForeground;
            bg = initialBackground;
        }
    }
    let initialForeground = "fgs1";
    let initialBackground = "bgs1";
    let fg: string = "fgs1";
    let bg: string = "bgs1";
</script>

{#if icon}
    {#if icon === "point"}
        <Point {fg} {bg} {isActive} />
    {:else if icon === "flow"}
        <Flow {fg} {bg} {isActive} />
    {:else if icon === "control"}
        <Control {fg} {bg} {isActive} />
    {/if}
{/if}

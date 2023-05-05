<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    export let label: string;
    export let isActive: boolean = false;
    function handleClick() {
        dispatch("click", { label });
    }
</script>

<button
    on:click={handleClick}
    class={isActive
        ? "bg-bgs3 flex flex-row p-4 rounded-md gap-4"
        : "bg-bgs2 flex flex-row p-4 rounded-md gap-4"}
>
    <div class="flex flex-row items-center truncate">
        <div class="text-h2">{label}</div>
    </div>
</button>

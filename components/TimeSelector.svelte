<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let selectedHour: string;
    export let selectedMinute: string;
    export let label: string;
    let hours: any[] = [];
    let minutes: any[] = [];
    const dispatch = createEventDispatcher();
    $: {
        hours = Array.from({ length: 24 }, (_, i) =>
            i.toString().padStart(2, "0")
        );
        minutes = Array.from({ length: 60 }, (_, i) =>
            i.toString().padStart(2, "0")
        );
    }
    function onChange() {
        dispatch("change", { value: selectedHour + ":" + selectedMinute });
    }
</script>

<div>{label}</div>
<div class="flex items-center space-x-2">
    <select
        class="bg-bgs2 p-2 border rounded-lg"
        bind:value={selectedHour}
        on:change={onChange}
    >
        {#each hours as hour}
            <option value={hour}>{hour}</option>
        {/each}
    </select>

    <span class="text-gray-400">:</span>

    <select
        class="bg-bgs2 p-2 border rounded-lg"
        bind:value={selectedMinute}
        on:change={onChange}
    >
        {#each minutes as minute}
            <option value={minute}>{minute}</option>
        {/each}
    </select>
</div>

<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let date: Date;

    function updateDate(e: any) {
        const newDate = new Date(e.target.value);
        date = newDate;
        dispatch("change", { date });
    }
</script>

<label class="block">
    <input
        type="date"
        on:input={updateDate}
        value={date.toISOString().substr(0, 10)}
        class="mt-1 block w-full bg-bgs2 p-2 rounded-sm"
    />
</label>

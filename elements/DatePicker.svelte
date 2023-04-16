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

<label class="block max-w-lg">
    <input
        type="date"
        on:input={updateDate}
        value={date.toISOString().substr(0, 10)}
        class="mt-1 block w-full bg-bgs2 p-2 rounded-sm"
    />
</label>

<style>
    input::-webkit-calendar-picker-indicator {
        /* Change the default appearance of the calendar icon */

        background-size: contain;
        background-repeat: no-repeat;
        filter: invert(60%);
    }

    input[type="date"] {
        margin-top: 1px;
    }

    ::-webkit-datetime-edit-text {
        /* Change the font style and color of the date value */
        font-size: 14px;
        font-family: sans-serif;
    }

    ::-webkit-datetime-edit-fields-wrapper {
        /* Change the padding of the date value fields */
        padding: 0.25rem;
    }

    ::-webkit-calendar-picker-popup {
        /* Change the background color and border of the calendar popover */
        background-color: rgba(var(--colors-bgs2));
        border: 1px solid #e5e7eb;
    }
</style>

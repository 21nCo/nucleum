<script lang="ts">
    export let label: string;
    export let checked: any;
</script>

<label class="flex items-center space-x-2 gap-1">
    <input
        type="checkbox"
        class="form-checkbox h-5 w-5 text-fgs1 transition duration-150 ease-in-out cursor-pointer rounded-sm"
        bind:checked
    />
    {label}
</label>

<style>
    input[type="checkbox"] {
        background-color: rgba(var(--colors-bgs2));
    }
</style>

<script lang="ts">
    export let isInEditMode: boolean = false;
</script>

<button
    on:click={() => {
        isInEditMode = !isInEditMode;
    }}
>
    <div
        class="w-6 h-6 rounded-full border-2 {isInEditMode
            ? 'border-dotted'
            : 'border-solid'} border-fgs1"
    />
</button>

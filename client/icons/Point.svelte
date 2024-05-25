<script lang="ts">
    export let fg: string;
    export let bg: string;
    export let isActive: boolean = false;
</script>

<svg
    width="17"
    height="18"
    viewBox="0 0 17 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <circle
        cx="8.5"
        cy="9.38281"
        r="8.5"
        class="fill-{fg} {isActive ? 'opacity-80' : 'opacity-50'}"
    />
</svg>

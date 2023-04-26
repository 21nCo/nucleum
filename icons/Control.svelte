<script lang="ts">
    export let fg: string;
    export let bg: string;
    export let isActive: boolean = false;
</script>

<svg
    width="18"
    height="14"
    viewBox="0 0 18 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <rect
        y="2.11719"
        width="18"
        height="2.11765"
        rx="1.05882"
        class="fill-{fg} {isActive ? 'opacity-100' : 'opacity-50'}"
    />
    <rect
        y="9.5293"
        width="18"
        height="2.11765"
        rx="1.05882"
        class="fill-{fg} {isActive ? 'opacity-100' : 'opacity-50'}"
    />
    <circle
        cx="11.6472"
        cy="3.17647"
        r="3.17647"
        class="fill-{fg} {isActive ? 'opacity-100' : 'opacity-50'}"
    />
    <circle
        cx="5.2939"
        cy="10.5876"
        r="3.17647"
        class="fill-{fg} {isActive ? 'opacity-100' : 'opacity-50'}"
    />
</svg>

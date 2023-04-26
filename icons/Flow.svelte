<script lang="ts">
    export let fg: string;
    export let bg: string;
    export let isActive: boolean = false;
</script>

<svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <rect
        y="4.09766"
        width="4.28571"
        height="10.7143"
        rx="1.07143"
        class="fill-{fg}  {isActive ? 'opacity-100' : 'opacity-50'}"
    />
    <rect
        x="10.7144"
        y="0.882812"
        width="4.28571"
        height="13.9286"
        rx="1.07143"
        class="fill-{fg}  {isActive ? 'opacity-100' : 'opacity-50'}"
    />
    <rect
        x="5.35693"
        y="6.24023"
        width="4.28571"
        height="8.57143"
        rx="1.07143"
        class="fill-{fg}  {isActive ? 'opacity-100' : 'opacity-50'}"
    />
</svg>

<script lang="ts">
  import { fly } from "svelte/transition";

  export let title: string;
  export let subtitle: string | undefined = undefined;
</script>

<div class="flex flex-col gap-3 items-center" in:fly={{ y: 10, duration: 500 }}>
  <p class="mo:text-h1 text-[44px] font-medium text-center">{title}</p>
  {#if subtitle}
    <p class="text-base mo:text-b2 text-center">{subtitle}</p>
  {/if}
</div>

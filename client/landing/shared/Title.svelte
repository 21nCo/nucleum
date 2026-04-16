<script lang="ts">
  import { fly } from "svelte/transition";

  let {
    title,
    subtitle = undefined,
  }: {
    title: string;
    subtitle?: string | undefined;
  } = $props();

</script>

<div class="flex flex-col gap-3 items-center" in:fly={{ y: 10, duration: 500 }}>
  <h2 class="mo:text-h1 text-[44px] font-medium text-center">{title}</h2>
  {#if subtitle}
    <p class="text-base mo:text-b2 text-center">{subtitle}</p>
  {/if}
</div>

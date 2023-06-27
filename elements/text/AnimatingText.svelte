<script lang="ts">
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";

  export let roll = ["Auth provider", "Cloud provider", "Identity provider"];
  let activeTextIndex = 0;

  onMount(() => {
    const interval = setInterval(() => {
      activeTextIndex = (activeTextIndex + 1) % roll.length;
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<span class="relative h-20 overflow-hidden">
  {#each roll as text, i}
    {#if i === activeTextIndex}
      <span
        class="absolute text min-w-max"
        in:fly={{ y: -50, duration: 500 }}
        out:fly={{ y: 100, duration: 200 }}
      >
        {text}
      </span>
    {/if}
  {/each}
</span>

<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import { tweened } from "svelte/motion";
  import { linear } from "svelte/easing";
  export let duration: number = 0;
  export let size: Size = Size.md;
  export let label: string = "";
  export let showPercentage: boolean = false;
  let sizeClasses: string = "";
  let progress = tweened(0, {
    duration: duration * 1000,
    easing: linear
  });

  onMount(() => {
    switch (size) {
      case Size.xxs:
      case Size.xs:
      case Size.sm:
        sizeClasses = "h-1";
        break;
      case Size.md:
        sizeClasses = "h-2";
        break;
      case Size.lg:
      case Size.xl:
      case Size.xxl:
        sizeClasses = "h-3";
        break;
    }

    if (duration > 0) {
      progress.set(100);
    }
  });
</script>

{#if label}
  <p class="text-b3 fgs2 mb-1">{label}</p>
{/if}
<div class="relative w-full rounded-full overflow-hidden {sizeClasses} bg-bgs2">
  <!-- <Element isAction={false} classList="absolute w-full h-full bg-bgs4" /> -->
  <!-- <div class="absolute bg-bgs3 w-full h-full" /> -->
  {#if showPercentage}
    <p
      class="absolute inset-0 flex items-center justify-center text-b3 text-abg z-10"
    >
      {Math.round($progress)}%
    </p>
  {/if}
  <div
    class="absolute left-0 top-0 h-full bg-aps1 rounded-full"
    style="width: {$progress}%"
  ></div>
</div>

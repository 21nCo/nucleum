<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  export let progress: number = 0;
  export let size: Size = Size.md;
  export let label: string = "";
  let sizeClasses: string = "";
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
  });
</script>

<p>{label}</p>
<div
  class="relative w-full rounded-full overflow-hidden mb-1 {sizeClasses} text-center text-b4"
>
  <!-- <Element isAction={false} classList="absolute w-full h-full bg-bgs4" /> -->
  <!-- <div class="absolute bg-bgs3 w-full h-full" /> -->
  {#if progress}
    <p class="z-10 absolute w-full">{Math.round(progress)}%</p>
  {/if}
  <div
    class="absolute left-0 top-0 h-full bg-aps1 rounded-full"
    style="width: {progress}%"
  ></div>
</div>

<script lang="ts">
  import type { FeatureWheelSpoke } from "$lib/client/types/featureWheel.type";
  import { Size } from "$lib/client/types/size.enum";
  export let spoke: FeatureWheelSpoke;
  export let xCoord: number;
  export let yCoord: number;
  export let size: Size = Size.md;
  $: widthFactor = size === Size.lg ? 8 : size === Size.md ? 7 : 5;
</script>

{#if spoke.isProminent || spoke.isNovel}
  <rect
    x={xCoord -
      (spoke.label.length <= 8 ? 25 : spoke.label.length * (widthFactor / 2))}
    y={yCoord - (size === Size.lg ? 10 : size === Size.md ? 8 : 5.5)}
    width={spoke.label.length <= 8 ? 50 : spoke.label.length * widthFactor}
    height={size === Size.lg ? 20 : size === Size.md ? 16 : 10}
    class="{spoke.isNovel ? 'fill-ags1' : 'fill-bgs1'} stroke-aps1 rounded-md"
    stroke-width="0.4"
  />
{/if}
<text
  x={xCoord}
  y={yCoord}
  text-anchor="middle"
  dominant-baseline="middle"
  class="font-thin fill-fgs1 {size === Size.lg
    ? 'text-b2'
    : size === Size.md
      ? 'text-b3'
      : size === Size.sm
        ? 'text-[0.5rem]'
        : 'text-[0.4rem]'}"
>
  {spoke.label}
</text>

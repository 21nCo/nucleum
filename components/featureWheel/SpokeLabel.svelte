<script lang="ts">
  import type { FeatureWheelSpoke } from "$lib/tidy/types/featureWheel.type";
  import { Size } from "$lib/tidy/types/size.enum";
  export let spoke: FeatureWheelSpoke;
  export let xCoord: number;
  export let yCoord: number;
  export let size: Size = Size.md;
</script>

{#if spoke.isProminent || spoke.isNovel}
  <rect
    x={xCoord - (spoke.label.length <= 8 ? 30 : spoke.label.length * 3.5)}
    y={yCoord - (size === Size.lg ? 13 : size === Size.md ? 10 : 8)}
    width={spoke.label.length <= 8 ? 60 : spoke.label.length * 7}
    height={size === Size.lg ? 26 : size === Size.md ? 20 : 16}
    class="{spoke.isNovel ? 'fill-ags1' : 'fill-bgs1'} stroke-aps1 rounded-md"
  />
{/if}
<text
  x={xCoord}
  y={yCoord}
  text-anchor="middle"
  dominant-baseline="middle"
  class=" {size === Size.lg
    ? 'text-b2'
    : size === Size.md
      ? 'text-b3'
      : size === Size.sm
        ? 'text-b4'
        : 'text-b5'}"
>
  {spoke.label}
</text>

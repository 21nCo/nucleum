<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";

  export let xCoord: number;
  export let yCoord: number;
  export let progress: number;
  export let size: Size = Size.md;
  let width =
    size === Size.lg
      ? "26"
      : size === Size.md
        ? "24"
        : size === Size.sm
          ? "22"
          : "20";
  let height =
    size === Size.lg
      ? "22"
      : size === Size.md
        ? "20"
        : size === Size.sm
          ? "18"
          : "16";
</script>

<rect
  x={xCoord - 2}
  y={yCoord - (size === Size.xs ? 1 : 2)}
  {width}
  {height}
  class="fill-bgs2"
/>
<text
  x={xCoord + 9}
  y={yCoord + 8}
  text-anchor="middle"
  dominant-baseline="middle"
  class="fill-fgs1 {size === Size.lg
    ? 'text-b4'
    : size === Size.md
      ? 'text-b5'
      : size === Size.sm
        ? 'text-[0.5rem]'
        : 'text-[0.45rem]'}"
>
  {Math.round((progress ?? 0) * 100)}%
</text>

<script lang="ts">
  import { Size } from "@21n/types/size.enum";

  let {
    xCoord,
    yCoord,
    progress,
    size = Size.md
  }: {
    xCoord: number;
    yCoord: number;
    progress: number;
    size?: Size;
  } = $props();
  const width = $derived(
    size === Size.lg
      ? "22"
      : size === Size.md
        ? "18"
        : size === Size.sm
          ? "16"
          : "14"
  );
  const height = $derived(
    size === Size.lg
      ? "18"
      : size === Size.md
        ? "16"
        : size === Size.sm
          ? "10"
          : "10"
  );
</script>

<rect x={xCoord} y={yCoord + 2} {width} {height} class="fill-bgs2" />
<text
  x={xCoord + 9}
  y={yCoord + 8}
  text-anchor="middle"
  dominant-baseline="middle"
  class="fill-fgs1 {size === Size.lg
    ? 'text-b4'
    : size === Size.md
      ? 'text-[0.38rem]'
      : size === Size.sm
        ? 'text-[0.32rem]'
        : 'text-[0.28rem]'}"
>
  {Math.round((progress ?? 0) * 100)}%
</text>

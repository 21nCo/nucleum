<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  let {
    label,
    color,
    xCoord,
    yCoord,
    onclick = (_event: MouseEvent) => {}
  }: {
    label: string;
    color: string | undefined;
    xCoord: number;
    yCoord: number;
    onclick?: (event: MouseEvent) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<text
  x={xCoord}
  y={yCoord}
  text-anchor="middle"
  dominant-baseline="middle"
  class={cn("text-b1 font-serif font-medium hover:cursor-pointer", {
    "fill-fgs2": !color
  })}
  fill={color}
  {onclick}
>
  {label}
</text>

<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  export let label: string;
  export let color: string | undefined;
  export let xCoord: number;
  export let yCoord: number;
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
  on:click
>
  {label}
</text>

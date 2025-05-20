<script lang="ts">
  import {
    FeatureWheelMode,
    type IFeatureWheelSpoke
  } from "$lib/client/types/featureWheel.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let spoke: IFeatureWheelSpoke;
  export let mode: FeatureWheelMode;
  export let xCoord: number;
  export let yCoord: number;
  export let size: Size = Size.md;
  export let isActive: boolean = false;
  export let groupColor: string = "fgs2";
  $: widthFactor = size === Size.lg ? 8 : size === Size.md ? 7 : 5;
</script>

{#if mode !== FeatureWheelMode.COMPARER && (spoke.isProminent || spoke.isNovel)}
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
  text-anchor={Math.abs(yCoord) > 200 ? "middle" : xCoord > 0 ? "start" : "end"}
  dominant-baseline="middle"
  role="button"
  tabindex="0"
  class={cn("cursor-pointer select-none focus:outline-none", {
    "fill-aps1 font-medium": isActive,
    "hover:fill-aps1 hover:font-medium": !isActive,
    "fill-fgs2": !isActive && !groupColor,
    "text-b2": size === Size.lg,
    "text-[10px]": size === Size.md,
    "text-[8px]": size === Size.sm,
    "opacity-60": spoke.isPlanned
  })}
  fill={groupColor ? groupColor : ""}
  on:click
  on:keydown={(e) =>
    e.key === "Enter" &&
    e.target &&
    e.target.dispatchEvent(new MouseEvent("click"))}
>
  {#if spoke.isPlanned}
    ◌&nbsp;
  {/if}
  {spoke.label}
</text>

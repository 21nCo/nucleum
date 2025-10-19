<script lang="ts">
  import {
    FeatureWheelMode,
    type IFeatureWheelSpoke
  } from "@21n/types/featureWheel.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  export let spoke: IFeatureWheelSpoke;
  export let mode: FeatureWheelMode;
  export let xCoord: number;
  export let yCoord: number;
  export let size: Size = Size.md;
  export let isActive: boolean = false;
  export let groupColor: string = "fgs2";
  $: widthFactor = size === Size.lg ? 8 : size === Size.md ? 7 : 5;
  $: label = spoke.shortLabel || spoke.label;
</script>

{#if isActive || (mode !== FeatureWheelMode.COMPARER && (spoke.isProminent || spoke.isNovel))}
  <rect
    x={Math.abs(yCoord) > 200
      ? xCoord - label.length * (widthFactor / 2)
      : xCoord > 0
        ? xCoord - 5
        : xCoord - label.length * (widthFactor / 1.1)}
    y={yCoord - (size === Size.lg ? 10 : size === Size.md ? 8 : 5.5)}
    width={label.length * widthFactor}
    height={size === Size.lg ? 20 : size === Size.md ? 16 : 10}
    class={cn("rounded-md", {
      "stroke-aps1": isActive && !groupColor,
      "fill-ags1": spoke.isNovel && mode !== FeatureWheelMode.COMPARER,
      "fill-bgs2": !spoke.isNovel || mode === FeatureWheelMode.COMPARER
    })}
    stroke-width="0.4"
    stroke={groupColor}
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
    "font-bold": isActive,
    "fill-aps1": isActive && !groupColor,
    "hover:font-bold transition-all duration-200": !isActive,
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
  {label}
</text>

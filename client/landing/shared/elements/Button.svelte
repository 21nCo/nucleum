<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "../../../types/size.enum";
  import QrElement from "./QRElement.svelte";

  export let type: "primary" | "secondary" = "primary";
  export let isShort: boolean = false;
  export let label = "";
  export let icon = "";
  export let QRURL: string | null = null;
  export let iconPosition: "start" | "end" = "end";
  let className: string = "";
  export { className as class };
  export let isHovering: boolean = false;
  export let enableHover: boolean = true;
  function handleHover() {
    if (!enableHover) return;
    isHovering = true;
  }
  function handleLeave() {
    if (!enableHover) return;
    isHovering = false;
  }
</script>

<button
  on:mouseenter={handleHover}
  on:mouseleave={handleLeave}
  class={cn(
    "box-border flex items-center justify-center gap-3 rounded-lg font-medium mo:text-[16px] leading--[33px] mo:leading--[22px]",
    className,
    {
      "bg-fgs1 hover:bg-fgs2 text-bgs1": type === "primary",
      "bg-bgs3 hover:bg-bgs4 text-fgs1 leading-7": type === "secondary",
      "text-[20px] h-[72px] px-[60px] tp:w-[360px] dp:w-[360px] mo:h-14 mo:px-[28px]":
        !isShort,
      "text-[18px] h-11 px-6": isShort,
      "flex-row-reverse": iconPosition === "start"
    }
  )}
  on:click
>
  <span class="text-nowrap">{label}</span>
  {#if icon}
    <SvgIcon {icon} size={Size.md} />
  {:else if QRURL && !$view.isPortrait}
    <QrElement bind:isHovering bind:enableHover url={QRURL} width={48} />
  {/if}
</button>

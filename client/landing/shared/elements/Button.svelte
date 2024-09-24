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
    "box-border flex items-center justify-center gap-3 rounded-xl font-medium",
    type == "primary" &&
      "bg-fgs1 hover:bg-fgs2 text-bgs1 text-[24px] mo:text-[16px] leading-[33px] mo:leading-[22px]",
    type == "secondary" &&
      "bg-bgs3 hover:bg-bgs4 text-fgs1 text-[20px] leading-7",
    isShort && "py-[12px] px-5",
    !isShort && "py-4 px-[60px]",
    type == "secondary" && !isShort && "w-[360px]",
    iconPosition == "start" && "flex-row-reverse",
    className
  )}
  on:click
>
  <span class="text-nowrap">{label}</span>
  {#if icon}
    <SvgIcon {icon} size={Size.lg} />
  {:else if QRURL && !$view.isPortrait}
    <QrElement bind:isHovering bind:enableHover url={QRURL} width={48} />
  {/if}
</button>

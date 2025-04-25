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
    "box-border flex items-center justify-center gap-3 rounded-full mo:text-[16px] leading--[33px] mo:leading--[22px]",
    {
      "bg-fgs1 hover:bg-fgs2 text-bgs1": type === "primary",
      "border border-fgs2 hover:bg-bgs4 text-fgs1 leading-7":
        type === "secondary",
      "text-base h-10 px-4": !isShort,
      "text-b2 h-8 px-3": isShort,
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

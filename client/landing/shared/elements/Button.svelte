<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "../../../types/size.enum";
  import QrElement from "./QRElement.svelte";

  export let type: "primary" | "secondary" = "primary";
  export let label = "";
  export let icon = "";
  export let QRURL: string | null = null;
  export let iconPosition: "start" | "end" = "start";
  let className: string = "";
  export { className as class };
</script>

<button
  class={cn(
    "flex items-center justify-center gap-3 py-4 mo:py-[14px] px-10 mo:px-7 rounded-xl font-medium",
    type == "primary" &&
      "bg-fgs1 hover:bg-fgs2 text-bgs1 text-[24px] mo:text-[16px] leading-[33px] mo:leading-[22px]",
    type == "secondary" &&
      "bg-bgs3 hover:bg-bgs4 text-fgs1 text-[20px] leading-7",
    iconPosition == "start" && "flex-row-reverse",
    className
  )}
  on:click
>
  <span>{label}</span>
  {#if icon}
    <SvgIcon {icon} size={Size.lg} />
  {:else if QRURL && !$view.isPortrait}
    <QrElement url={QRURL} width={48} />
  {/if}
</button>

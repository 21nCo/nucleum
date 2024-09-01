<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "../../../types/size.enum";
  export let label = "";
  export let icon = "";
  export let position: "start" | "end" = "start";
  let className: string = "";
  export { className as class };
</script>

<button
  class={cn(
    "bg-fgs1 hover:bg-fgs2 flex items-center justify-center gap-3 py-4 px-10 rounded-xl text-bgs1 text-[24px] leading-[33px] font-medium",
    className
  )}
  on:click
>
  <span>{label}</span>
  {#if icon}
    <SvgIcon {icon} size={Size.lg} />
  {/if}
</button>

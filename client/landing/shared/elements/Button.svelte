<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "../../../types/size.enum";
  export let label = "";
  export let href: string = "";
  export let icon = "";
  export let position: "start" | "end" = "start";
  function onClick() {
    if (href) {
      //   window.location.href = href;
      window.open(href, "_blank");
    }
  }
</script>

<button
  class="m-2 bg-fgs1 hover:bg-fgs2 flex items-center justify-center gap-9 py-4 px-14 rounded-xl"
  on:click={onClick}
>
  <span class="text-bgs1 text-[24px] leading-[33px] font-medium">{label}</span>
  {#if icon}
    <SvgIcon {icon} size={Size.lg} class="text-bgs1 " />
  {/if}
</button>

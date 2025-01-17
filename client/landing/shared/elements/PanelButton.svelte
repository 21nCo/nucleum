<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { PanelName } from "../Landing.types";
  import DayAndNightToggle from "../DayAndNightToggle.svelte";
  export let label: string;
  export let icon: string;
  let className: string = "";
  export { className as class };
  export let id: string = "";
  export let isProduct: boolean = false;
  export let isRightPanel: boolean = false;
  let disableBG: boolean = false;
  $: isInteractive = isProduct || isRightPanel;
  // function onScroll(e) {
  //   const viewportHeight = window.innerHeight;
  //   const scrollDistance = e.target.scrollTop;
  //   if (scrollDistance > viewportHeight / 3) {
  //     disableBG = true;
  //   } else if (disableBG) {
  //     disableBG = false;
  //   }
  // }
  // onMount(() => {
  //   document
  //     .getElementById("centre-panel")
  //     ?.addEventListener("scroll", onScroll);
  // });
</script>

{#if !$view.isPortrait}
  <!-- {#if !disableBG}
    <SvgIcon
      icon="bg-circle-smugged"
      class="absolute h-full top-0 left-0  pointer-events-none text-bgg1 opacity-100"
    />
    <SvgIcon
      icon="bg-circle-smugged-right"
      class="absolute -top-[80px] right-[50%] z-[999] pointer-events-none text-bgg1 opacity-100"
    />
  {/if} -->
  <button
    {id}
    class={cn(
      "w-[115px] h-full flex flex-col items-center justify-center p-4 text-center text-fgs3 text-base leading-5 ml-[1px]",
      label == PanelName.PRODUCTS && "border-l border-brs2 hover:border-brs3",
      label == PanelName.BUILT_AT_BLANK_COOP &&
        "border-r border-brs2 hover:border-brs3",
      className,
      {
        "hover:text-aps1": isInteractive
      }
    )}
    on:click
  >
    {#if isInteractive}
      <SvgIcon {icon} size={Size.lg} class="mb-2" />
      {label}
    {:else}
      <DayAndNightToggle />
    {/if}
  </button>
{/if}

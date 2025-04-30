<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { PanelName } from "../landing.type";
  import DayAndNightToggle from "../DayAndNightToggle.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import appearance from "$lib/client/stores/appearance.store";
  import { Theme } from "$lib/client/types/appearance.type";
  export let label: string;
  export let description: string;
  export let icon: string;
  let className: string = "";
  export { className as class };
  export let id: string = "";
  export let isProduct: boolean = false;
  export let isRightPanel: boolean = false;
  let isHovered: boolean = false;
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
      "w-[115px] h-full flex flex-col items-center justify-center p-4 text-center text-fgs2 text-opacity-80 text-base leading-5 ml-[1px] border-brs3",
      className,
      {
        "border-l": label == PanelName.PRODUCTS,
        "border-r": label == "21n",
        "hover:text-fgs1": isInteractive
      }
    )}
    on:click
    use:hoverable={{
      onHover: (value) => {
        isHovered = value;
      }
    }}
  >
    {#if isInteractive}
      {#if isHovered}
        <SvgIcon {icon} size={Size.lg} />
      {/if}
      {#if isHovered}
        {description ?? label}
      {:else if label === "21n"}
        <SvgIcon icon="21n-temp" size={Size.xl} />
      {:else}
        {label}
      {/if}
    {:else}
      <DayAndNightToggle />
    {/if}
  </button>
{/if}

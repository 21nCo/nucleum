<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import DayAndNightToggle from "./DayAndNightToggle.svelte";
  import type { IHeroInputs } from "./Landing.types";
  import Section from "./Section.svelte";
  import Pulldown from "./play/Pulldown.svelte";
  import { isProductsPanelOpen } from "./store/shared.store";

  export let heroInputs: IHeroInputs;
</script>

<Section class="relative justify-center min-h-[93vh]">
  <div class="flex flex-col items-center justify-center text-center -mt-32">
    {#if heroInputs.title}
      {@const title = heroInputs.title}
      <div
        class="text-[108px] mo:text-[36px] font-black leading-[148px] mo:leading-[50px] h-[148px] mo:h-[49px] w-[1110px] mo:w-[342px]"
      >
        {title}
      </div>
    {/if}
    {#if heroInputs.label}
      {@const label = heroInputs.label}
      <p
        class="text-h2 mo:text-base font-medium leading-9 mo:leading-5 h-[72px] mo:h-[66px] w-[861px] mo:w-[303px] mt-4"
      >
        {label}
      </p>
    {/if}
    {#if $view.isPortrait}
      <div
        class="flex items-center justify-end w-[138px] h-[36px] border-b pb-0 mt-6"
        on:click={() => ($isProductsPanelOpen = true)}
        on:keypress
      >
        <p class="text-[16px] leading-9 text-center">See our products</p>
        <SvgIcon icon="long-arrow-right" size={Size.sm} class="ml-1" />
      </div>
    {/if}
  </div>
  {#if $view.isPortrait}
    <DayAndNightToggle class="absolute bottom-12" />
  {:else}
    <Pulldown class="absolute bottom-12" />
  {/if}
</Section>

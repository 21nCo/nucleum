<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import type { IHeroInputs } from "./Landing.types";
  import LightDarkModeToggle from "./LightDarkModeToggle.svelte";
  import Section from "./Section.svelte";
  import Pulldown from "./play/Pulldown.svelte";

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
  </div>
  {#if $view.isPortrait}
    <LightDarkModeToggle class="absolute bottom-12" />
  {:else}
    <Pulldown class="absolute bottom-12" />
  {/if}
</Section>

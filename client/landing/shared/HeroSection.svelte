<script lang="ts">
  import type { IHeroInputs } from "./Landing.types";
  import Section from "./Section.svelte";
  import Pulldown from "./play/Pulldown.svelte";

  export let heroInputs: IHeroInputs;
</script>

<Section class="relative">
  <div class="flex flex-col items-center justify-center text-center -mt-32">
    {#if heroInputs.title}
      {@const title = heroInputs.title}
      <div class="text-[108px] font-black leading-[148px] h-[148px] w-[1110px]">
        {title}
      </div>
    {/if}
    {#if heroInputs.label}
      {@const label = heroInputs.label}
      <p
        class="text-h2 font-medium leading-9 h-[72px] w-[861px] mt-4
    "
      >
        {label}
      </p>
    {/if}
  </div>
  <Pulldown class="absolute bottom-12" />
</Section>

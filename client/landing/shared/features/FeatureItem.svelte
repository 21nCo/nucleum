<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IFeature } from "../landing.type";
  import VisualRender from "../VisualRender.svelte";
  export let feature: IFeature;
  export let isReversed: boolean = false;
</script>

<div
  class={cn("flex mo:flex-col gap-32 h-[36rem] mo:h-auto w-full", {
    "flex-row-reverse": isReversed
  })}
>
  {#if !$view.isConstrainedWidth}
    <div
      class="h-full w-2/3 min-w-[20rem] dp:min-w-[30rem] mo:w-full bg-bgs1 rounded-t-xl flex justify-center overflow-clip relative"
    >
      <img
        src={feature.image}
        alt={feature.title}
        class="absolute top-12 inset-x-0 object-contain px-12"
      />
    </div>
  {/if}
  <div class="flex flex-col gap-4">
    <div
      class={cn("text-lb2 text-left", {
        "text-aps1": isReversed,
        "text-ags1": !isReversed
      })}
    >
      {feature.feature}
    </div>
    <div class="flex flex-col gap-5">
      <h3 class="text-[36px] mo:text-h2 font-medium text-left">
        {feature.title}
      </h3>
      <p class="text-lbase text-fgs2 text-left">{feature.desc}</p>
      <div class="flex justify-center items-center">
        <VisualRender name={feature.visualRenderComponent} />
      </div>
    </div>
    {#if feature.tutorialUrl}
      <div
        class="flex items-center gap-3 mt-4 border border-brs3 rounded-md py-2 px-4 w-1/2"
      >
        <div class="w-20 h-11 bg-bgs3 rounded-md">
          <!-- TODO video thumbnail -->
        </div>
        <div class="flex flex-col gap-1">
          <div class="text-lb2 text-left font-medium">
            {feature.feature}
          </div>
          <div class="text-b3 text-fgs3 text-left">Watch tutorial</div>
        </div>
      </div>
    {/if}
  </div>
</div>

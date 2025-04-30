<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import SVGIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IHighlight } from "../landing.type";
  import VisualRender from "../VisualRender.svelte";
  export let highlight: IHighlight;
  export let isFullWidth: boolean = false;
</script>

<div
  class={cn(
    "flex mo:gap-6 bg-bgs1 mo:h-fit h-64 rounded-xl pt-6 pl-6 mo:flex-col mo:text-center overflow-hidden",
    {
      "flex-col gap-4 pr-6": highlight.isVisualAtBottom,
      "gap-8": !highlight.isVisualAtBottom,
      "w-full": isFullWidth
    }
  )}
>
  <div class="flex flex-col gap-2 flex-1">
    <div class="flex flex-col gap-3 mo:justify-center">
      <SVGIcon icon={highlight.icon} size={Size.lg} />
      <h3 class="text-h4 font-semibold text-left">{highlight.title}</h3>
    </div>
    <p class="text-lb2 text-fgs2 text-left">{highlight.desc}</p>
  </div>

  <div class="flex-1 flex justify-center items-center">
    <VisualRender name={highlight.visualRenderComponent} />
  </div>
</div>

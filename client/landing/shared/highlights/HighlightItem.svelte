<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import SVGIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IHighlight } from "../landing.type";
  import VisualRender from "../VisualRender.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let highlight: IHighlight;
  export let isFullWidth: boolean = false;
</script>

<div
  class={cn(
    "flex mo:gap-6 bg-bgs1 mo:h-fit h-64 rounded-xl pt-6 pl-6 mo:flex-col mo:text-center overflow-hidden",
    {
      "flex-col gap-4 pr-6":
        highlight.isVisualAtBottom || !highlight.visualRenderComponent,
      "gap-8": !highlight.isVisualAtBottom,
      "w-full": isFullWidth
    }
  )}
>
  <div class="flex flex-col gap-2 flex-1">
    <div class="flex flex-col gap-3 mo:justify-center">
      <div class="h-8">
        {#if highlight.icon.includes(":")}
          <span>
            <Icon icon={highlight.icon} size={Size.xl} class="text-aps1" />
          </span>
        {:else}
          <SVGIcon icon={highlight.icon} size={Size.lg} />
        {/if}
      </div>
      <h3 class="text-h4 font-semibold text-left">{highlight.title}</h3>
    </div>
    <p class="text-lb2 text-fgs2 text-left">{highlight.desc}</p>
  </div>
  {#if highlight.visualRenderComponent}
    <div
      class={cn("flex-1 flex items-center", {
        "justify-center": highlight.isVisualAtBottom,
        "justify-end": !highlight.isVisualAtBottom
      })}
    >
      <VisualRender name={highlight.visualRenderComponent} />
    </div>
  {/if}
</div>

<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import SVGIcon from "@21n/elements/SVGIcon.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { IHighlight } from "@21n/landing/shared/landing.type";
  import VisualRender from "@21n/landing/shared/VisualRender.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import view from "@21n/stores/view.store";
  let {
    highlight,
    isFullWidth = false,
  }: {
    highlight: IHighlight;
    isFullWidth?: boolean;
  } = $props();

</script>

<a
  class={cn(
    "flex cw:gap-6 bg-bgs1 mo:h-fit h-64 rounded-xl cw:p-4 pt-6 pl-6 mo:flex-col mo:text-center overflow-hidden",
    {
      "flex-col gap-4 pr-6":
        highlight.isVisualAtBottom || !highlight.visualRenderComponent,
      "gap-8": !highlight.isVisualAtBottom,
      "w-full": isFullWidth,
      "hover:brightness-95": highlight.link
    }
  )}
  title={highlight.link ? "Click to learn more" : ""}
  href={highlight.link ?? "#"}
  target={highlight.link?.startsWith("http") ? "_blank" : "_self"}
  rel={highlight.link?.startsWith("http") ? "noopener noreferrer" : undefined}
>
  <div class="flex flex-col gap-2 flex-1 cw:items-start">
    <div class="flex flex-col gap-3 cw:items-start">
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
        "justify-center":
          highlight.isVisualAtBottom ||
          ($view.isConstrainedWidth && !highlight.isJustifyEndOnCw),
        "justify-end":
          (!$view.isConstrainedWidth && !highlight.isVisualAtBottom) ||
          highlight.isJustifyEndOnCw
      })}
    >
      <VisualRender name={highlight.visualRenderComponent} />
    </div>
  {/if}
</a>

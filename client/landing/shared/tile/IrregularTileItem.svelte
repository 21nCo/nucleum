<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import Svg from "@21n/products/memotron/pdfAnnotator/Svg.svelte";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type { ITileItem } from "@21n/landing/shared/landing.type";
  import { landing } from "@21n/landing/shared/store/shared.store";

  export let item: ITileItem;
  export let isEnableBackground: Boolean = false;

  let className: string = "";
  export { className as class };

  let isHovered = false;
  function onMouseEnter() {
    isHovered = true;
  }
  function onMouseLeave() {
    isHovered = false;
  }
  function onClick() {
    if (item.href) {
      landing.openLink(item.href);
    }
  }
</script>

<button
  class={cn(
    "relative flex flex-col items-start justify-start gap-4 min-w-[320px] max-w-[512px] mo:h-[400px] bg-bgs2 px-7 pt-7 rounded-2xl hover:bg-bgs3",
    className
  )}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:click={onClick}
>
  {#if item?.title}
    {@const title = item.title}
    <div class="flex items-center w-full">
      <h1
        class={cn(
          "text-[20px] leading-10 mo:leading-7 font-extrabold text-left"
        )}
      >
        {title}
      </h1>
    </div>
  {/if}
  {#if item?.description}
    {@const description = item.description}
    <p class={cn("text-left mo:w-[290px]")}>
      {description}
    </p>
  {/if}
  <!-- {#if item?.image}
    {@const image = item.image}
    <div class="flex justify-center h-45% mt-9 mo:mt-4">
      <img src={image} alt={item.title} class={cn("object-contain")} />
    </div>
  {/if} -->
</button>

<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import Svg from "$lib/client/products/memotron/pdfAnnotator/Svg.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITileItem } from "../Landing.types";

  export let item: ITileItem;
  export let isPanelView: Boolean = false;
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
      window.open(item.href, "_self");
    }
  }
</script>

<button
  class={cn(
    "relative flex flex-col items-start justify-start",
    !isPanelView &&
      "relative gap-3 portrait:min-w-[340px] tp:!min-w-[380px] w--[498px] h-[471px] mo:h-[292px] bg-bgs2 px-7 pt-7 rounded-2xl hover:bg-bgs3",
    isPanelView &&
      "relative min-w-[161px] max-w-[260px] rounded-xl px-[14px] tp:px-5 pt-[14px] tp:pt-5 gap-2",
    isPanelView &&
      isEnableBackground &&
      "bg-bgs2 hover:bg-bgs3 h-[256px] mo:h-[197px]",
    isPanelView &&
      !isEnableBackground &&
      "border-2 border-brs3 hover:border-brs4 h-[190px] mo:h-[161px]",
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
          !isPanelView &&
            "text-[30px] mo:text-[20px] leading-10 mo:leading-7 font-extrabold",
          isPanelView &&
            "text-[22px] mo:text-[16px] leading-8 mo:leading-5 font-extrabold"
        )}
      >
        {title}
      </h1>
      {#if item.href && !isPanelView}
        <div class="ml-auto">
          <span
            class={cn(
              "text-[20px] font-normal leading-[28px] p-2 opacity-0 underline underline-offset-4",
              isHovered && "animate-fadeIn"
            )}>{item.href?.split("://")[1]}</span
          >
          <div class="inline-flex relative">
            <i class={cn("inline-flex ", isHovered && "animate-rotate45")}>
              <SvgIcon
                icon="arrow-NW"
                size={$view.isPortrait ? Size.xxs : Size.xs}
              /></i
            ><i class={cn("inline-flex", isHovered && "animate-fadeOut")}>
              <SvgIcon
                icon="circle"
                size={$view.isPortrait ? Size.lg : Size.xl}
                class={cn(
                  "absolute top-[-10px]",
                  $view.isPortrait && "left-[-8px]",
                  !isPanelView && "left-[-10px]"
                )}
              /></i
            >
          </div>
        </div>
      {/if}
    </div>
  {/if}
  {#if item?.description}
    {@const description = item.description}
    <p
      class={cn(
        !isPanelView &&
          "text-[20px] mo:text-[14px] leading-[28px] mo:leading-5 font-normal text-left mo:w-[290px]",
        isPanelView &&
          "text-base mo:text-[14px] leading-[22px] mo:leading-5 font-normal text-left"
      )}
    >
      {description}
    </p>
  {/if}
  {#if item?.image}
    {@const image = item.image}
    <img
      src={`/images/${image}.png`}
      alt={item.title}
      class={cn(
        "absolute mo:h-[35%] object-contain bottom-1 right-1",
        isPanelView && "h-[43%]",
        !isPanelView && "h-[55%]"
      )}
    />
  {/if}
</button>

<style>
  @keyframes rotate30 {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(45deg);
    }
  }

  .rotate-animation {
    animation: rotate30 1s infinite;
  }
</style>

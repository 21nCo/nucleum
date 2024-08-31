<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import Svg from "$lib/client/products/memotron/pdfAnnotator/Svg.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITileItem } from "../Landing.types";

  export let item: ITileItem;
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
  class="flex flex-col items-start justify-startc gap-3 w-[598px] h-[471px] bg-bgs2 px-7 pt-7 rounded-2xl hover:bg-bgs3"
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:click={onClick}
>
  {#if item?.title}
    {@const title = item.title}
    <div class="flex items-center w-full">
      <h1 class="text-[30px] leading-10 font-extrabold">
        {title}
      </h1>
      {#if item.href}
        <div class="ml-auto">
          <span
            class={cn(
              "text-[20px] font-normal leading-[28px] p-2 opacity-0 underline underline-offset-4",
              isHovered && "animate-fadeIn"
            )}>{item.href?.split("app.")[1]}</span
          >
          <div class="inline-flex relative">
            <i class={cn("inline-flex ", isHovered && "animate-rotate45")}>
              <SvgIcon icon="arrow-NW" size={Size.xs} /></i
            ><i class={cn("inline-flex", isHovered && "animate-fadeOut")}>
              <SvgIcon
                icon="circle"
                size={Size.xl}
                class="absolute top-[-10px] left-[-10px]"
              /></i
            >
          </div>
        </div>
      {/if}
    </div>
  {/if}
  {#if item?.description}
    {@const description = item.description}
    <p class="text-[20px] leading-[28px] font-normal text-justify">
      {description}
    </p>
  {/if}
  {#if item?.image}
    {@const image = item.image}
    <img
      src={`/images/${image}.png`}
      alt={item.title}
      class="w-[480px] h-[280px] mt-16 ml-16"
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

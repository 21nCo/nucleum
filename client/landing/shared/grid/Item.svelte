<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IGridItem } from "../Landing.types";

  export let item: IGridItem;

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
  class="flex flex-col items-start justify-center gap-[14px] w-[480px] mo:w-[342px]"
  on:click={onClick}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
>
  <div
    class={cn(
      "inline-flex flex-col rounded-2xl gap-5",
      isHovered && "text-aps1"
    )}
  >
    {#if item?.icon}
      {@const icon = item.icon}
      <SvgIcon {icon} size={Size.xxl} />
    {/if}
    {#if item?.title}
      {@const title = item.title}
      <h1
        class="text-[28px] mo:text-[20px] leading-10 mo:leading-7 font-extrabold"
      >
        {title}
      </h1>
    {/if}
  </div>
  {#if item?.description}
    {@const description = item.description}
    <p class="text-[20px] mo:text-base text-left mo:text-justify">
      {description}
    </p>
  {/if}
</button>

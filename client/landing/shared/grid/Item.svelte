<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type { IGridItem } from "@21n/landing/shared/landing.type";

  export let item: IGridItem;

  let isHovered = false;
  function onMouseEnter() {
    isHovered = true;
  }
  function onMouseLeave() {
    isHovered = false;
  }
</script>

<a
  class="flex flex-col items-start justify--center gap-[14px] w-[480px] mo:w-[342px] max-w-full"
  href={item.href}
  target="_blank"
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
>
  <div
    class={cn(
      "inline-flex flex-col items-start rounded-2xl gap-5",
      isHovered && "text-aps1"
    )}
  >
    {#if item?.icon}
      {@const icon = item.icon}
      <Icon {icon} size={Size.xxl} class="text-fgs1" />
      <!-- <SvgIcon {icon} size={Size.xxl} /> -->
    {/if}
    {#if item?.title}
      {@const title = item.title}
      <h1 class="text-h3 cw:text-h5 font-medium text-left">
        {title}
      </h1>
    {/if}
  </div>
  {#if item?.description}
    {@const description = item.description}
    <p class="text-fgs2 text-lb2 text-left mo:text-justify">
      {description}
    </p>
  {/if}
</a>

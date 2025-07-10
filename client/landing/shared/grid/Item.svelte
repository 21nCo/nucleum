<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IGridItem } from "../landing.type";
  import { landing } from "../store/shared.store";

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
      landing.openLink(item.href);
    }
  }
</script>

<button
  class="flex flex-col items-start justify--center gap-[14px] w-[480px] mo:w-[342px] max-w-full"
  on:click={onClick}
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
</button>

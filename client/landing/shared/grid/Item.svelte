<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IItem } from "../Landing.types";

  export let item: IItem;
</script>

<div class="flex flex-col items-start justify-center gap-3 w-[480px]">
  {#if item?.icon}
    {@const icon = item.icon}
    <SvgIcon {icon} size={Size.xxl} />
  {/if}
  {#if item?.title}
    {@const title = item.title}
    <h1 class="text-[28px] leading-10 font-extrabold">{title}</h1>
  {/if}
  {#if item?.description}
    {@const description = item.description}
    <p class="text-[20px] text-justify">{description}</p>
  {/if}
</div>

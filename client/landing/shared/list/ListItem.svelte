<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import SVGIcon from "@21n/elements/SVGIcon.svelte";
  import { Size } from "@21n/types/size.enum";
  export let item: IListItem;
</script>

<a class="flex items-center gap-1.5 text-lb2" href={item.href} target="_blank" rel="noopener noreferrer">
  {#if item.icon}
    <SVGIcon
      icon={item.icon}
      size={Size.lg}
      phIconSize={Size.md}
      isRenderRaw={true}
    />
  {/if}
  <p>{item.title}</p>
</a>

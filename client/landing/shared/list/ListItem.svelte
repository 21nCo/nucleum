<script lang="ts">
  import type { IListItem } from "../landing.type";
  import SVGIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let item: IListItem;
</script>

<a class="flex items-center gap-1.5 text-lb2" href={item.href} target="_blank">
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

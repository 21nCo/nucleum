<script lang="ts">
  import type { IListItem } from "../Landing.types";
  import SVGIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let item: IListItem;
</script>

<div class="flex items-center gap-2 text-lb2">
  {#if item.icon}
    <SVGIcon icon={item.icon} size={Size.lg} />
  {/if}
  <p>{item.title}</p>
</div>

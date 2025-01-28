<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IBlockBrowserItem } from "./blockBrowser.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let item: IBlockBrowserItem;
</script>

<button
  class="flex flex-col gap-2 items-center bg-bgs3 hover:bg-bgs4 rounded-md p-2 h-fit"
  on:click={() => {
    dispatch("select", item.type);
  }}
>
  <Icon icon={item.icon} />
  <span class="text-b3 text-fgs2 whitespace-nowrap">
    {item.label}
  </span>
</button>

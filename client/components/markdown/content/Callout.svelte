<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { MdStoreType } from "../markdown.store";
  import type { IBlock } from "../md.type";
  import TextContent from "./TextContent.svelte";
  export let mdStore: MdStoreType;
  export let block: IBlock;
</script>

<div
  class="flex gap-3 items-start bg-aps3 border border-aps1 rounded-md px-4 py-1"
>
  <div class="flex items-center justify-center py-2">
    <Icon icon="hugeicons:quote-up" class="text-aps1" />
  </div>
  <div class="text-aps1 w-full">
    <TextContent {block} {mdStore} />
  </div>
</div>

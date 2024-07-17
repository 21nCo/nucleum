<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import type { INodeThumbnail } from "$lib/client/types/memotron/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import { contentPreview } from "$lib/client/products/memotron/node/node.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/client/utils/time.utils";
  export let parentBgIndex: number = 0;
  export let node: INodeThumbnail;
  export let version: 1 | 2 = 2;
</script>

<button
  class="flex flex-col border border-brs3 rounded-md h-72 w-80 hover:border-aps1"
  on:click
>
  <div class="h-3/4 w-full p-4">
    <!-- Preview content -->
    {#if "body" in node && node.body}
      <span class="text-left text-b2">
        {contentPreview(node.body)}
      </span>
    {/if}
  </div>
  <div
    class="flex flex-col gap-2 bg-bgs2 h-1/4 w-full rounded-b-md border border-brs2 items-start p-2"
  >
    <span class="flex items-center gap-1 w-full">
      {#if node.type?.avatar}
        <AvatarView avatar={node.type.avatar} size={Size.sm} />
      {/if}
      <span class="text-left w-5/6 truncate">
        {node.label ?? ""}
      </span>
    </span>
    <span class="text-b3 text-fgs3">
      {formatDatetime($userPreferences, new Date(node.createdAt))}
    </span>
  </div>
</button>

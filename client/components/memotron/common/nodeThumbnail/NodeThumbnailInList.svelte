<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import {
    NodeType,
    type INodeThumbnail
  } from "$lib/client/types/memotron/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import { contentPreview } from "$lib/client/utils/node.utils";
  import { properCase } from "$lib/client/utils/text.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/client/utils/time.utils";
  export let parentBgIndex: number = 0;
  export let node: INodeThumbnail;
  export let version: 1 | 2 = 2;
</script>

{#if version === 1}
  <BackgroundElement
    type="button"
    {parentBgIndex}
    class="flex flex-col gap-1 max-h-fit rounded-md w-full p-4 hover:bg-bgs2"
    on:click
  >
    <div class="flex w-full justify-between">
      <span class="text-b3 text-fgs3">
        {formatDate(new Date(node.createdAt))}
        {formatTime($userPreferences, new Date(node.createdAt))}
      </span>
      <span class="bg-aps2 rounded-md px-2 text-b3">
        {properCase(node.contentType)}
      </span>
    </div>
    <div class="w-full text-left truncate text-fgs2 font-medium text-h5">
      {node.label ?? ""}
    </div>
    {#if node.contentType === NodeType.AUDIO}
      <audio class="bg-transparent" controls src={node.body.url} />
    {/if}
    {#if "body" in node && node.body}
      <span class="text-left text-b2">
        {contentPreview(node.body)}
      </span>
    {/if}
    {#if node.links}
      <!-- <div class="pt-4">
      <DLinks links={node.links} context="nodethumbnail" />
    </div> -->
    {/if}
  </BackgroundElement>
{:else if version == 2}
  <button
    class="flex justify-between border border-brs3 p-4 rounded-md w-full hover:bg-bgs2"
    on:click
  >
    <span class="flex flex-col items-start gap-2 grow max-w-[70%] h-full">
      <span class="flex items-center gap-2 w-full">
        {#if node.type?.avatar}
          <AvatarView avatar={node.type.avatar} size={Size.sm} />
        {/if}
        <span class="w-5/6 text-left truncate text-fgs2 font-medium text-h5">
          {node.label ?? ""}
        </span>
      </span>
      {#if "body" in node && node.body}
        <span class="text-left text-b2">
          {contentPreview(node.body)}
        </span>
      {/if}
    </span>
    <span class="min-w-fit">
      <!-- selected properties -->
      <span class="text-b4 text-fgs3">
        {formatDatetime($userPreferences, new Date(node.createdAt))}
      </span>
    </span></button
  >
{/if}

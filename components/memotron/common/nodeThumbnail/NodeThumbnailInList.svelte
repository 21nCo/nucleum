<script lang="ts">
  import AvatarView from "$lib/tidy/elements/avatarPicker/AvatarView.svelte";
  import BackgroundElement from "$lib/tidy/elements/style/BackgroundElement.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import {
    NodeType,
    type NodeThumbnail
  } from "$lib/tidy/types/memotron/node.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { contentPreview } from "$lib/tidy/utils/node.utils";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/tidy/utils/time.utils";
  export let parentBgIndex: number = 0;
  export let node: NodeThumbnail;
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
      <span class="flex items-center gap-1 w-full">
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
      <span class="text-b3 text-fgs3">
        {formatDatetime($userPreferences, new Date(node.createdAt))}
      </span>
    </span></button
  >
{/if}

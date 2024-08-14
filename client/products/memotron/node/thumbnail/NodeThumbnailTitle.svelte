<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { Size } from "$lib/client/types/size.enum";
  import { type INode, NodeType } from "../../node/node.type";
  export let node: INode;
  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
  $: console.log({ node });
</script>

<div class="flex justify-between w-full">
  <span class="flex gap-2 grow">
    <!--TODO Avatar and parent breadcrumbs for node -->
    {#if node.contentType === NodeType.WEB_PAGE}
      {#if node.metadata.faviconLink}
        <img
          src={node.metadata.faviconLink}
          alt="favicon"
          class="w-5 h-5 rounded-full"
        />
      {:else}
        <Icon icon="globe-alt" size={Size.sm} />
      {/if}
    {/if}
    <span class="text-left w-5/6 truncate text-b2 font--medium">
      <!-- TODO - if node and has parent, show breadcrumbs -->
      {#if node.label}
        {node.label}
      {:else if node.body && typeof node.body === "string"}
        <InlineMarkdownTextInput content={node.body} />
      {:else if node.body && node.body.text && typeof node.body.text === "string"}
        {node.body.text}
      {:else}
        {resolveEmptyLabel()}
      {/if}
      <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
    </span>
  </span>
  {#if node.isStarred}
    <Icon icon="star" class="fill-yellow-400" />
  {/if}
</div>

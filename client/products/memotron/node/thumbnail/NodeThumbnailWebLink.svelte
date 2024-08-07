<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { internalUrlNodeTypeList, type INode } from "../node.type";
  export let item: INode;
  function extractDomain(url: string) {
    const domain = new URL(url).hostname;
    return domain;
  }
</script>

{#if !internalUrlNodeTypeList.includes(item.contentType) && item.body.url}
  <button
    class="flex gap-0.5 items-center underline text-fgs3 text-b4"
    on:click|stopPropagation
  >
    <Icon icon="link-mini" size={Size.sm} />
    <a href={item.body.url} target="_blank" rel="noopener noreferrer">
      {extractDomain(item.body.url)}
    </a>
  </button>
{/if}

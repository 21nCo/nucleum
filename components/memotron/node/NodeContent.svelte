<script lang="ts">
  import { contentPreview } from "$lib/tidy/utils/node.utils";
  import Markdown from "$lib/tidy/components/markdown/Markdown.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import { NodeType } from "$lib/tidy/types/node.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { resolveActiveNodeStore } from "./node.store";
  export let id: string;
  export let mdId: string;
  const node = resolveActiveNodeStore(id);
</script>

<div class="flex flex-col h-full flex-grow pl-12 pt-2">
  {#if $node && ($node.contentType === NodeType.NODULAR_MARKDOWN || ($node.contentType === NodeType.NON_NODULAR_MARKDOWN && "body" in $node))}
    <Markdown
      id={mdId}
      md={"body" in $node &&
      $node?.contentType === NodeType.NON_NODULAR_MARKDOWN
        ? $node.body
        : $node}
      params={{
        isNodular: true,
        isReadOnly: false,
        actions: ["cop--y", "cop--yRaw"]
      }}
    />
  {:else if $node?.contentType === NodeType.AUDIO && $node && "url" in $node.body}
    <audio controls src={$node.body?.url} />
  {:else if $node?.contentType === NodeType.WEBPAGE && $node.children && $node.children.length > 0}
    <div class="flex flex-col items-start gap-4">
      <Text content="Clips" style={TextStyle.SECTION_HEADING} />
      <div class="flex flex-col items-start gap-2 overflow-auto">
        {#each $node.children as clip}
          <div class="bg-bgs2 rounded-md p-2">
            {clip?.body?.text}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

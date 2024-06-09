<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import {
    NodeType,
    type INodeStructure
  } from "$lib/client/types/memotron/node.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { hierarchyFactorLimit, resolveActiveNodeStore } from "./node.store";

  import {
    deepCopy,
    isValidArrayWithData,
    shallowDiff
  } from "$lib/client/utils/obj.utils";
  import AudioScrubablePreview from "../capture/AudioScrubablePreview.svelte";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  export let id: string;
  export let mdId: string;
  let previousRootStructure: string[] = [];
  const node = resolveActiveNodeStore(id);
  let refreshId = Date.now();
  // const nodePersistance = new NodePersistance($account.userInfo?.id ?? "");
  function retireveNode() {
    node.fetch();
    refreshId = Date.now();
  }
  function onMarkdownContentChange(e: CustomEvent) {
    console.log("Markdown content changed", { e });
    if (e.detail.block.id && "body" in e.detail.block) {
      node.updateBlock(e.detail.block.id, { body: e.detail.block.body });
    }
  }
  async function onMarkdownInsertChanges(e: CustomEvent) {
    console.log("Markdown insert changes", { e });
    const detail = e.detail;
    if (!detail?.id) return;
    const result = await node.createBlock(
      detail.id,
      detail.blockType ?? NodeType.SIMPLE_TEXT
    );
  }
  function onMarkdownConvertChanges(e: CustomEvent) {
    console.log("Markdown convert changes", { e });
    if (e.detail.id && e.detail.blockType) {
      node.updateBlock(e.detail.id, { contentType: e.detail.blockType });
    }
  }
  function onMarkdownBlockDelete(e: CustomEvent) {
    console.log("Markdown block deleted", { e });
    if (!e.detail.id) return;
    node.deleteBlock(e.detail.id);
  }
  function onReStructure(e: CustomEvent) {
    console.log("Markdown restructured", { e });
    const differences = shallowDiff(previousRootStructure, e.detail.root);
    console.log("Differences", differences);
    if (isValidArrayWithData(differences)) {
      node.updateBlock(id, { children: e.detail.root });
    }
    previousRootStructure = deepCopy(e.detail.root);
    if (!e.detail.children) return;
    e.detail.children
      .filter((x: INodeStructure) => x.factor <= hierarchyFactorLimit)
      .forEach((child: INodeStructure) => {
        node.updateBlock(child.id, { children: child.children });
      });
  }
</script>

{#key refreshId}
  <div class="flex flex-col h-full flex-grow pt-2">
    {#if $node && ($node.contentType === NodeType.NODULAR_MARKDOWN || ($node.contentType === NodeType.NON_NODULAR_MARKDOWN && "body" in $node))}
      <NodularMarkdown
        node={$node}
        {mdId}
        md={$node.md}
        on:change={onMarkdownContentChange}
        on:insert={onMarkdownInsertChanges}
        on:convert={onMarkdownConvertChanges}
        on:delete={onMarkdownBlockDelete}
        on:restructure={onReStructure}
      />
    {:else if $node?.contentType === NodeType.AUDIO && $node && "url" in $node.body}
      <!-- <audio controls src={$node.body?.url} /> -->
      <AudioScrubablePreview
        on:refresh={retireveNode}
        body={$node?.body}
        nodeId={$node.id}
      />
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
{/key}

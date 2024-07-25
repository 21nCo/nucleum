<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import {
    NodeType,
    headingNodeTypes,
    type INodeStructure
  } from "$lib/client/products/memotron/node/node.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { hierarchyFactorLimit, type IActiveNodeStore } from "./node.store";

  import {
    deepCopy,
    isValidArrayWithData,
    shallowDiff
  } from "$lib/shared/utils/obj.utils";
  import AudioScrubablePreview from "../capture/AudioScrubablePreview.svelte";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import PdfAnnotator from "../pdfAnnotator/pdfAnnotator.svelte";
  import { onMount } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  export let node: IActiveNodeStore;
  export let mdId: string;
  let previousRootStructure: string[] = [];
  let refreshId = Date.now();
  let markdownRef: any;
  onMount(() => {
    const focusEventSub = node.eventStore.subscribe((x) => {
      console.log("nodeFocusEvent", { x, id: $node.id });
      if (!x) return;
      const currentAccessMode = appStore.determineCurrentResourceAccessMode(
        $node.id
      );
      const clickedAccessMode = appStore.determineClickAccessMode(x.event);
      console.log({ currentAccessMode, clickedAccessMode });
      if (clickedAccessMode && clickedAccessMode !== currentAccessMode) {
        appStore.resourceClickHandler(x.event, x.id, currentAccessMode);
        node.eventStore.set(undefined);
        return;
      }
      const result = markdownRef?.focus(x.id);
      console.log("focus result", { result });
      if (result.status === 1) {
        node.onFocus(x.id, result.parent);
      } else if (result.status === 0) {
        node.unFocus();
      } else if (result.status === -1) {
        appStore.resourceClickHandler(x.event, x.id, currentAccessMode);
      }
      node.eventStore.set(undefined);
    });
    return () => {
      focusEventSub();
    };
  });
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
      node.updateBlock($node.id, { children: e.detail.root });
    }
    previousRootStructure = deepCopy(e.detail.root);
    if (!e.detail.children) return;
    e.detail.children
      .filter((x: INodeStructure) => x.factor <= hierarchyFactorLimit)
      .forEach((child: INodeStructure) => {
        node.updateBlock(child.id, { children: child.children });
      });
  }
  function onMention(e: CustomEvent) {
    const detail = e.detail;
    console.log("Mention", { e });
    if (!detail.id || !detail.location) return;
    node.mention(detail.location, detail.id);
  }
  function onUnMention(e: CustomEvent) {
    console.log("Unmention", { e });
  }
  function onFocus(e: CustomEvent) {
    console.log("onFocus", { e });
    if (e.detail.id && e.detail.parent) {
      node.onFocus(e.detail.id, e.detail.parent);
    }
  }
</script>

{#key refreshId}
  <div class="flex flex-col h-full flex-grow pt-2">
    {#if $node && ($node.contentType === NodeType.NODULAR_MARKDOWN || ($node.contentType === NodeType.NON_NODULAR_MARKDOWN && "body" in $node) || (headingNodeTypes.includes($node.contentType) && "children" in $node))}
      <NodularMarkdown
        node={$node}
        {mdId}
        bind:md={$node.md}
        bind:this={markdownRef}
        on:change={onMarkdownContentChange}
        on:insert={onMarkdownInsertChanges}
        on:convert={onMarkdownConvertChanges}
        on:delete={onMarkdownBlockDelete}
        on:restructure={onReStructure}
        on:mention={onMention}
        on:unmention={onUnMention}
        on:focus={onFocus}
      />
    {:else if $node?.contentType === NodeType.AUDIO && $node && "url" in $node.body}
      <!-- <audio controls src={$node.body?.url} /> -->
      <AudioScrubablePreview
        on:refresh={retireveNode}
        body={$node?.body}
        nodeId={$node.id}
      />
    {:else if $node?.contentType === NodeType.VIDEO && $node && "url" in $node.body}
      <video controls>
        <source src={$node.body.url} />
        <track kind="captions" />
      </video>
    {:else if $node?.contentType === NodeType.IMAGE && $node && "url" in $node.body}
      <img alt="..." class="object-contain" src={$node.body.url} />
    {:else if $node?.contentType === NodeType.PDF && $node && "url" in $node.body}
      <PdfAnnotator url={$node.body.url} />
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

<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import {
    NodeType,
    headingNodeTypes,
    type INodeStructure
  } from "$lib/client/products/memotron/node/node.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { hierarchyFactorLimit, type IActiveNodeStore } from "../node.store";

  import {
    deepCopy,
    isValidArrayWithData,
    shallowDiff
  } from "$lib/shared/utils/obj.utils";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { formatDate, formatDatetime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let node: IActiveNodeStore;
  export let mdId: string;
  let previousRootStructure: string[] = [];
  let refreshId = Date.now();
  let markdownRef: any;
  import { setContext } from "svelte";

  function handleEvent(message: any) {
    logger.log({ at: "node context", message });
    if (!message) return;
    const detail = message.data;
    if (message.event === "mention") {
      if (!detail.id || !detail.location) return;
      node.mention(detail.location, detail.id);
    }
  }
  setContext("node", handleEvent);

  onMount(() => {
    refreshCounts();
    const focusEventSub = node.eventStore.subscribe((x) => {
      logger.log({ at: "Node content - nodeFocusEvent", x, id: $node.id });
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

  let wordCount = 0;
  let charCount = 0;
  const targetDivId = "mdContent";

  function refreshCounts() {
    const targetDiv = document.getElementById(targetDivId);
    if (targetDiv) {
      const divContent = targetDiv.innerHTML;
      const strippedContent = stripHtml(divContent);
      wordCount = countWords(strippedContent);
      charCount = strippedContent.length;
    } else {
      wordCount = 0;
      charCount = 0;
    }
    $node.wordCount = wordCount;

    function countWords(text: string): number {
      return text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
    }

    function stripHtml(html: string): string {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    }
  }

  function retireveNode() {
    node.fetch();
    refreshId = Date.now();
  }
  function onMarkdownContentChange(e: CustomEvent) {
    logger.log({ at: "onMarkdownContentChange - test", ...e.detail });
    refreshCounts();
    const block = e.detail.block;
    if (block.source && "body" in block) {
      node.updateBlock(block.source, { body: block.body });
    }
  }
  async function onMarkdownInsertChanges(e: CustomEvent) {
    logger.log({ at: "onMarkdownInsertChanges", ...e.detail });
    refreshCounts();
    const detail = e.detail;
    if (!detail?.id) return;
    const result = await node.createBlock(
      detail.id,
      detail.blockType ?? NodeType.SIMPLE_TEXT
    );
  }
  function onMarkdownConvertChanges(e: CustomEvent) {
    logger.log({ at: "onMarkdownConvertChanges", ...e.detail });
    if (e.detail.source && e.detail.toType) {
      if (headingNodeTypes.includes(e.detail.fromType)) {
        node.updateBlock(e.detail.source, {
          contentType: e.detail.toType,
          children: []
        });
      } else
        node.updateBlock(e.detail.source, { contentType: e.detail.toType });
    }
  }
  function onMarkdownBlockDelete(e: CustomEvent) {
    logger.log({ at: "onMarkdownBlockDelete", e });
    if (!e.detail.source) return;
    node.deleteBlock(e.detail.source);
  }
  function onReStructure(e: CustomEvent) {
    logger.log({ at: "onReStructure", ...e.detail });
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

  function onFocus(e: CustomEvent) {
    logger.log({ at: "onFocus", ...e.detail });
    if (e.detail.id && e.detail.parent) {
      node.onFocus(e.detail.id, e.detail.parent);
    }
  }
</script>

{#key refreshId}
  <div class="flex flex-col h--full grow pt-2">
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
        on:focus={onFocus}
        on:ready={refreshCounts}
      />
      <div class="flex w-full justify-center items-center mt--20 mt-4">
        <div class="flex flex-col gap-2 ml-12 w-full mo:w--9/10 w--4/5">
          <Divider colorStrength={ColorStrength.Strong} />
          <div class="flex w-full justify-between text-b3 text-fgs3">
            <!-- <div class="text-b3 text-fgs3">End of content.</div> -->
            <div>
              {wordCount} words
            </div>
            <div class="min-w-fit whitespace-nowrap">
              Modified: {formatDatetime(
                $userPreferences,
                new Date($node.modifiedAt)
              )}
            </div>
          </div>
        </div>
      </div>
      <ScrollViewBottomSpacer />
      <ScrollViewBottomSpacer />
      <ScrollViewBottomSpacer />
    {:else if $node?.contentType === NodeType.WEB_PAGE && $node.children && $node.children.length > 0}
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

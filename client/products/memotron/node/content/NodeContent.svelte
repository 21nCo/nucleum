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
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { onDestroy, onMount } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let node: IActiveNodeStore;
  export let mdId: string;
  let previousRootStructure: string[] = [];
  let refreshId: number | undefined = undefined;
  let markdownRef: any;
  import { setContext } from "svelte";
  import { BlockAction } from "$lib/client/components/markdown/md.type";
  import { wordCounter } from "$lib/client/actions/counter.action";
  import { generateResourceId } from "$lib/client/components/flux/flux.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";

  function handleEvent(event: string, data: any) {
    logger.log({ at: "node context", event, data });
    if (!event) return;
    if (event === "mention") {
      if (!data.item || !data.location) return;
      node.mention(data.location, data.item.id);
    }
  }
  const contentContext = {
    publish: handleEvent
  };
  setContext("content", contentContext);

  let focusEventSub: any;

  onMount(async () => {
    if ($node.children && $node.children.length < 1) {
      const id = generateResourceId(Resource.node);
      const createdBlock = await node.createBlock(id, NodeType.SIMPLE_TEXT, {
        body: ""
      });
      console.log({ createdBlock });
      if (createdBlock?.[0]) {
        await node.modify(
          {
            children: [createdBlock[0].id]
          },
          {
            isPreventBackPropagation: true
          }
        );
        $node.children = [createdBlock[0]];
      }
    }
    focusEventSub = node.eventStore.subscribe((x) => {
      logger.debug({
        at: "Node content - nodeFocusEvent listener",
        x,
        id: $node.id
      });
      if (!x) return;
      const currentAccessMode = appStore.determineCurrentResourceAccessMode(
        $node.id
      );
      const clickedAccessMode = appStore.determineClickAccessMode(x.event);
      console.log({ currentAccessMode, clickedAccessMode });
      if (clickedAccessMode && clickedAccessMode !== currentAccessMode) {
        appStore.openResource(x.id, clickedAccessMode);
        node.eventStore.set(undefined);
        return;
      }
      //TODO - temp direct reload instead of within focus
      temp_Focus(x.id, currentAccessMode);
      node.eventStore.set(undefined);
      return;
      const result = markdownRef?.focus(x.id);
      console.log({ result, id: x.id });
      if (result?.status === 1) {
        node.onFocus(x.id, result.parent);
      } else if (result?.status === 0) {
        node.unFocus();
      } else if (result?.status === -1) {
        appStore.openResource(x.id, currentAccessMode);
      }
      node.eventStore.set(undefined);
    });

    refreshId = Date.now();
  });

  function temp_Focus(id: IRecordId, accessMode: ResourceAccessMode) {
    appStore.openResource(id, accessMode);
  }

  onDestroy(() => {
    focusEventSub();
  });

  function refreshCounts(e: any) {
    if (!e) return;
    $node.wordCount = e.words;
    $node.charCount = e.characters;
  }

  function onMarkdownContentChange(e: CustomEvent) {
    logger.log({ at: "NodeContent - onMarkdownContentChange", ...e.detail });
    const block = e.detail.block;
    if (block.source && "body" in block) {
      node.updateBlock(block.source, { body: block.body });
    }
  }

  function onReStructure(e: CustomEvent) {
    logger.log({ at: "NodeContent - onReStructure", ...e.detail });
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

  /**
   * TODO - disabling direct focus on blocks until all edge cases are handled for node page.
   */
  function onFocus(e: CustomEvent) {
    logger.debug({ at: "NodeContent - onFocus", ...e.detail });
    if (e.detail.id && e.detail.parent) {
      temp_Focus(
        e.detail.id,
        appStore.determineCurrentResourceAccessMode($node.id)
      );
      // node.onFocus(e.detail.id, e.detail.parent);
    }
  }

  function onBlockAction(e: CustomEvent) {
    logger.log({
      at: "NodeContent - onBlockAction",
      action: e.detail.action,
      detail: e.detail
    });
    switch (e.detail.action) {
      case BlockAction.INSERT:
        onInsert(e);
        break;
      case BlockAction.CONVERT:
        onConvert(e);
        break;
      case BlockAction.DUPLICATE:
        onDuplicate(e);
        break;
      case BlockAction.DELETE:
        onDelete(e);
        break;
    }
    async function onInsert(e: CustomEvent) {
      logger.log({ at: "NodeContent - onInsert", ...e.detail });
      const detail = e.detail;
      if (!detail?.id) return;
      const blockType = detail.blockType ?? NodeType.SIMPLE_TEXT;
      const result = await node.createBlock(detail.id, blockType, {
        body: blockType === NodeType.SIMPLE_TEXT ? "" : null
      });
    }

    function onConvert(e: CustomEvent) {
      logger.log({ at: "NodeContent - onConvert", ...e.detail });
      if (e.detail.source && e.detail.toType) {
        if (headingNodeTypes.includes(e.detail.fromType)) {
          node.updateBlock(e.detail.source, {
            contentType: e.detail.toType,
            children: []
          });
        } else if (e.detail.toType === NodeType.MEDIA_GRID) {
          node.updateBlock(e.detail.source, {
            contentType: e.detail.toType,
            body: null
          });
        } else {
          node.updateBlock(e.detail.source, { contentType: e.detail.toType });
        }
      }
    }

    async function onDuplicate(e: CustomEvent) {
      logger.log({ at: "NodeContent - onDuplicate", ...e.detail });
      const block = e.detail;
      const result = await node.createBlock(block.id, block.contentType, {
        body: block.body
      });
    }

    function onDelete(e: CustomEvent) {
      logger.log({ at: "NodeContent - onDelete", e });
      if (!e.detail.source) return;
      node.deleteBlock(e.detail.source);
    }
  }
</script>

{#if refreshId}
  {#key refreshId}
    <div
      class="flex flex-col h--full grow pt-2"
      use:wordCounter={{ onUpdate: refreshCounts }}
    >
      {#if $node && ($node.contentType === NodeType.NODULAR_MARKDOWN || ($node.contentType === NodeType.NON_NODULAR_MARKDOWN && "body" in $node) || (headingNodeTypes.includes($node.contentType) && "children" in $node))}
        <NodularMarkdown
          node={$node}
          {mdId}
          bind:md={$node.md}
          bind:this={markdownRef}
          on:change={onMarkdownContentChange}
          on:restructure={onReStructure}
          on:focus={onFocus}
          on:ready={refreshCounts}
          on:action={onBlockAction}
        />
        <div
          class="flex w-full justify-center items-center mt-8 exclude-from-count"
        >
          <div class="flex flex-col gap-2 ml-12 w-full mo:w--9/10 w--4/5">
            <Divider colorStrength={ColorStrength.Strong} />
            <div class="flex w-full justify-between text-b3 text-fgs3">
              <!-- <div class="text-b3 text-fgs3">End of content.</div> -->
              <div>
                {$node.wordCount} words
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
        <ScrollViewBottomSpacer size={Size.xl} />
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
{/if}

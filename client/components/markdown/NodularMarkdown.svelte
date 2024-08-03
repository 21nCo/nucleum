<script lang="ts">
  import type {
    IBlock,
    IMarkdown,
    IMarkdownParams
  } from "$lib/client/components/markdown/md.type";
  import {
    NodeType,
    headingNodeTypes,
    type INode,
    type INodeHierarchyV1,
    type INodeStructure
  } from "$lib/client/products/memotron/node/node.type";
  import { createEventDispatcher } from "svelte";
  import Markdown from "./Markdown.svelte";
  import { recursivelyExtractAllChildrenIntoArray } from "./markdown.utils";
  import { hierarchyFactorLimit } from "$lib/client/products/memotron/node/node.store";
  const dispatch = createEventDispatcher();

  /**
   * Markdown in node form i.e. each block of the markdown stored as node record and nested under each node
   */
  export let node: INode | undefined = undefined;

  /**
   * Markdown as a linear array of blocks i.e. blocks of the markdown stored as a single record on server.
   *
   * This is used to
   * 1. Capture a markdown
   * 2. Back propagate block content changes to the parent component in the case of Nodular Markdown.
   *
   * See {@link propagateChanges} and {@link onBlockContentChange} for more details on propagation.
   */
  export let md: IMarkdown;

  /**
   * @readonly
   * List of all blocks with their structure i.e. children parsed from the markdown
   */
  export let childrenWithStructure: INodeStructure[] = [];

  /**
   * @readonly
   * List of all children blocks with their structure when a heading is focused i.e. children parsed from the focused heading markdown.
   */
  export let focusedBlockChildrenWithStructure: INodeStructure[] = [];

  /**
   * @readonly
   * The list of block ids in the root of the markdown - to maintain the structure of the root markdown and propagate the changes back to the parent component.
   *
   * See {@link reCalculateStructure} and {@link extractRootStructure} for more details on how this is calculated.
   */
  export let rootStructure: string[] | undefined = undefined;
  export let mdId: string;
  export let isNodular: boolean = node != undefined;
  let refreshId: number = new Date().getTime();

  /**
   * Scoped blocks from {@link md} which is used to render the markdown.
   *
   * This is used to render the markdown when a heading is focused.
   */
  let _md: IMarkdown;

  /**
   * @deprecated - children structure determination trail 1
   */
  let hierarchyV1: INodeHierarchyV1[] = [];

  /**
   * The heading block which is focused when nodularity is enabled via {@link isNodular}
   */
  let focusedBlock: string | undefined = undefined;

  /**
   * The block in main root markdown until which the blocks are clipped starting from focused heading block when a heading is focused.
   *
   * This is used to reverse propagate the changes that happened when a heading block is focused.
   *
   * {@link md} and {@link childrenWithStructure} maintains the root blocks and structure of the markdown. Using this anchorBlock, {@link _md} and {@link focusedBlockChildrenWithStructure} - changes are propagated back to {@link md} and {@link childrenWithStructure}.
   */
  let anchorBlock: string | undefined = undefined;
  export let params: IMarkdownParams | undefined = undefined;
  if (node) {
    _md = { blocks: recursivelyExtractAllChildrenIntoArray(node) };
    reCalculateStructure(_md, true);
    setTimeout(() => {
      dispatch("ready");
    }, 1000);
    // dispatch("ready");
  } else {
    _md = md;
    dispatch("ready");
  }
  /**
   * @deprecated - used with v1 resolution of {@link hierarchyV1}
   * @param blockType
   */
  function resolveFactorV1(blockType: NodeType) {
    switch (blockType) {
      case NodeType.HEADING1:
        return 5;
      case NodeType.HEADING2:
        return 4;
      case NodeType.HEADING3:
        return 3;
      case NodeType.HEADING4:
        return 2;
      case NodeType.HEADING5:
        return 1;
      default:
        return 0;
    }
  }
  function resolveFactor(blockType: NodeType) {
    switch (blockType) {
      case NodeType.HEADING1:
        return 1;
      case NodeType.HEADING2:
        return 2;
      case NodeType.HEADING3:
        return 3;
      case NodeType.HEADING4:
        return 4;
      case NodeType.HEADING5:
        return 5;
      default:
        return 100;
    }
  }
  /**
   * @deprecated - used with v1 resolution of {@link hierarchyV1}
   * @param root
   * @param insertedAt
   * @param parent
   * @param id
   */
  function traverse(
    root: INodeHierarchyV1,
    insertedAt: string,
    parent: INodeHierarchyV1 | null,
    id?: string
  ): { parent: INodeHierarchyV1 | null; siblings: INodeHierarchyV1[] } | null {
    if (root.id === insertedAt) {
      let siblings: INodeHierarchyV1[] = [];
      if (parent) {
        const index = parent.children.findIndex(
          (child) => child.id === insertedAt
        );
        siblings = parent.children.slice(index + 1);
        if (id) {
          parent.children = [
            ...parent.children.slice(0, index + 1),
            { id, factor: 0, children: [] },
            ...siblings
          ];
        }
      }
      return { parent, siblings };
    }
    for (const child of root.children) {
      const found = traverse(child, insertedAt, root, id);
      if (found) {
        return found;
      }
    }
    return null;
  }
  /**
   * @deprecated
   * @param event
   */
  function onBlockInsertV1(event: any) {
    const detail = event.detail;
    console.log("onBlockInsert", {
      detail,
      hierarchy: hierarchyV1,
      blocks: node
    });
    if (!detail.blockType || !headingNodeTypes.includes(detail.blockType)) {
      const root = { id: "md", factor: 0, children: hierarchyV1 };
      const location = traverse(root, detail.insertedAt, null, detail.id);
      hierarchyV1 = root.children;
      console.log({ location, root, hierarchy: hierarchyV1 });
    } else if (
      detail.blockType &&
      headingNodeTypes.includes(detail.blockType)
    ) {
      const factor = resolveFactorV1(detail.blockType);
      let headingChildren: any = [];
      //TODO - recursive function to find the children going up the tree
    }
  }

  /**
   * Extracts the structure of the children blocks from the markdown.
   * @param blocks
   */
  function extractStructureForChildren(blocks: IMarkdown): INodeStructure[] {
    let structure: INodeStructure[] = [];
    let collapsedHierarchy: INodeStructure[] = [];
    structure = blocks.blocks.map((block) => {
      return {
        id: block.id,
        factor: resolveFactor(block.contentType as NodeType),
        children: []
      };
    });
    let leftovers: INodeStructure[] = [...structure];
    [5, 4, 3, 2, 1].forEach((level) => {
      const levelBlocks = leftovers.filter((block) => block.factor === level);
      if (levelBlocks.length === 0) return;
      levelBlocks.forEach((block) => {
        const index = leftovers.findIndex((b) => b.id === block.id);
        const stopIndex = leftovers.findIndex(
          (b, i) => i > index && b.factor <= block.factor
        );
        if (stopIndex === -1) {
          block.children = leftovers.slice(index + 1).map((x) => x.id);
          leftovers = leftovers.filter((b) => !block.children.includes(b.id));
          return;
        }
        const children = leftovers.slice(index + 1, stopIndex);
        block.children = children.map((x) => x.id);
        leftovers = leftovers.filter((b) => !block.children.includes(b.id));
      });
      collapsedHierarchy = [...collapsedHierarchy, ...levelBlocks];
    });
    collapsedHierarchy.forEach((block) => {
      const item = structure.find((x) => x.id === block.id);
      if (item) item.children = block.children;
    });
    console.log({ collapsedHierarchy, structure });
    return structure;
  }
  /**
   * Extracts the root structure of the markdown from the children structure.
   */
  function extractRootStructure() {
    let rootBlocks: any = [];
    let firstHeadingHit = false;
    childrenWithStructure.forEach((block) => {
      if (!firstHeadingHit && block.factor <= hierarchyFactorLimit) {
        firstHeadingHit = true;
        rootBlocks.push(block);
      } else if (!firstHeadingHit) rootBlocks.push(block);
      else if (block.factor > hierarchyFactorLimit) return;
      else {
        const lowestFactor = Math.min(...rootBlocks.map((x) => x.factor));
        if (block.factor <= lowestFactor) {
          rootBlocks.push(block);
        }
      }
    });
    return rootBlocks;
  }
  /**
   *
   * calculates the structure of the root markdown upon changes in structure of the markdown.
   *
   * Root structure will not change when a heading is focused since the user cannot add headings greater or equal in hierarchy to the focused heading.
   *
   * @param md
   * @param isInitCalculation
   */
  function reCalculateStructure(md: IMarkdown, isInitCalculation = false) {
    const result = extractStructureForChildren(md);
    if (!focusedBlock) childrenWithStructure = result;
    else {
      focusedBlockChildrenWithStructure = result;
      //Parse using achorBlock as below will disturb hierarchy
      // const remaining = childrenWithStructure.filter((block) => {
      //   return !result.some((y) => y.id === block.id);
      // });
      // childrenWithStructure = [...remaining, ...result];
      const focusedBlockIndex = childrenWithStructure.findIndex(
        (x) => x.id === focusedBlock
      );
      const anchorBlockIndex = childrenWithStructure.findIndex(
        (x) => x.id === anchorBlock
      );
      let succeedingBlocks: INodeStructure[] = [];
      const preBlocks = childrenWithStructure.slice(0, focusedBlockIndex);
      if (anchorBlockIndex > 0)
        succeedingBlocks = childrenWithStructure.slice(anchorBlockIndex);
      childrenWithStructure = [
        ...preBlocks,
        ...focusedBlockChildrenWithStructure,
        ...succeedingBlocks
      ];
    }
    if (!focusedBlock) rootStructure = extractRootStructure().map((x) => x.id);
    if (isInitCalculation) return;
    //TODO - if focused - propagate only children of the focusedNode
    dispatch("restructure", {
      root: rootStructure,
      children: focusedBlock
        ? focusedBlockChildrenWithStructure
        : childrenWithStructure
    });
  }
  function onBlockStructuralChanges(event: any) {
    if (isNodular) reCalculateStructure(event.detail.md);
    propagateChanges(event.detail.md);
    console.log("onBlockStructuralChanges", {
      detail: event.detail,
      childrenWithStructure,
      rootStructure,
      node,
      md
    });
  }
  function onBlockInsertV2(event: any) {
    dispatch("insert", event.detail);
    onBlockStructuralChanges(event);
  }
  function onBlockConvert(event: any) {
    dispatch("convert", event.detail);
    onBlockStructuralChanges(event);
  }
  function onBlockDelete(event: any) {
    dispatch("delete", event.detail);
    onBlockStructuralChanges(event);
  }
  /**
   * Merges the focused markdown with the root markdown when a heading is focused.
   * @param focusedMd - the markdown of the focused heading
   * @returns - the merged markdown
   */
  function mergeFocusedMd(focusedMd: IMarkdown) {
    const focusedBlockIndex = md.blocks.findIndex((x) => x.id === focusedBlock);
    const anchorBlockIndex = md.blocks.findIndex((x) => x.id === anchorBlock);
    let succeedingBlocks: IBlock[] = [];
    const preBlocks = md.blocks.slice(0, focusedBlockIndex);
    if (anchorBlockIndex > 0)
      succeedingBlocks = md.blocks.slice(anchorBlockIndex);
    return {
      blocks: [...preBlocks, ...focusedMd.blocks, ...succeedingBlocks]
    };
  }
  /**
   * Propagates changes back to the {@link md} when content in markdown changes.
   * md returned from events is used instead of using _md directly as {@link Markdown} component used md store internally to maintain the state of the markdown. _md binding is back propagated from Markdown with a delay.
   * @param updatedMd - the updated markdown parsed from events from {@link Markdown}
   */
  function propagateChanges(updatedMd: IMarkdown) {
    if (!focusedBlock) md = updatedMd;
    else md = mergeFocusedMd(updatedMd);
  }
  /**
   * This function is called when the content of a block changes. It propagates the changes to the parent component for persistence.
   * @param event
   */
  function onBlockContentChange(event: any) {
    console.log("onBlockChanges", { event });
    const detail = event.detail;
    propagateChanges(detail.md);
    dispatch("change", { md, block: detail });
  }
  /**
   * Resolves the anchor block when a heading is focused.
   * @param focusedBlock - the focused block id
   * @returns - the anchor block id and the index of the anchor block in the root markdown and the index of the focused block in the root markdown
   */
  function resolveAnchorBlock(focusedBlock: string) {
    let focusBlockIndex = -1;
    let anchorBlockIndex = undefined;
    let anchorBlock;
    focusBlockIndex =
      childrenWithStructure.findIndex((x) => x.id === focusedBlock) ??
      focusBlockIndex;
    const factor = childrenWithStructure.find(
      (x) => x.id === focusedBlock
    )?.factor;
    console.log({ focusBlockIndex, factor });
    if (!factor) return { focusBlockIndex, anchorBlockIndex };
    const succeedingBlocks = childrenWithStructure.slice(focusBlockIndex + 1);
    anchorBlock = succeedingBlocks.find((b) => b.factor <= factor);
    if (anchorBlock)
      anchorBlockIndex = childrenWithStructure.findIndex(
        (x) => x.id === anchorBlock?.id
      );
    return {
      id: anchorBlock?.id,
      focusBlockIndex,
      anchorBlockIndex
    };
  }
  function extractParent(id: string): string[] {
    const parent = childrenWithStructure.find((x) => x.children?.includes(id));
    if (parent) return [...extractParent(parent.id), parent.id];
    else return node?.id ? [node?.id] : [];
  }

  export function focus(blockToFocus: string) {
    if (!blockToFocus) return;
    if (blockToFocus === focusedBlock) return;
    if (blockToFocus === node?.id) {
      unFocus();
      return { status: 0, parent: [] };
    }
    if (childrenWithStructure.findIndex((x) => x.id === blockToFocus) == -1)
      return { status: -1 };
    focusedBlock = blockToFocus;
    const { id, anchorBlockIndex, focusBlockIndex } =
      resolveAnchorBlock(focusedBlock);
    anchorBlock = id;
    const blocks = md.blocks.slice(focusBlockIndex, anchorBlockIndex);
    _md = { blocks };
    refreshId = new Date().getTime();
    console.log("focus", {
      blockToFocus,
      anchorBlock,
      focusBlockIndex,
      childrenWithStructure,
      rootStructure
    });
    const parent = extractParent(blockToFocus);
    return { status: 1, parent };
  }
  function onBlockFocus(event: any) {
    propagateChanges(event.detail.md);
    if (!event.detail.id) return;
    focus(event.detail.id);
    const parent = extractParent(event.detail.id);
    dispatch("focus", { id: event.detail.id, parent });
    console.log("onBlockFocus", { event, parent, md });
  }
  export function unFocus() {
    focusedBlock = undefined;
    _md = { blocks: md.blocks };
    refreshId = new Date().getTime();
  }
  $: console.log({ focusedBlock, node, md });
</script>

{#key refreshId}
  <Markdown
    bind:md={_md}
    id={mdId}
    params={{
      isNodular,
      placeholder: "Start typing or choose a type to get started...",
      canUseSlashShortcut: true,
      ...params
    }}
    on:change={onBlockContentChange}
    on:insert={onBlockInsertV2}
    on:convert={onBlockConvert}
    on:focus={onBlockFocus}
    on:delete={onBlockDelete}
    on:mention
    on:unmention
  />
{/key}

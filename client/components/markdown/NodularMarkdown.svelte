<script lang="ts">
  import type { IMarkdown } from "$lib/client/types/memotron/md.type";
  import {
    MdChangePropagationType,
    NodeType,
    headingNodeTypes,
    type INode,
    type INodeHierarchyV1,
    type INodeStructure
  } from "$lib/client/types/memotron/node.type";
  import { createEventDispatcher } from "svelte";
  import Markdown from "./Markdown.svelte";
  import { recursivelyExtractAllChildrenIntoArray } from "./markdown.utils";
  import { hierarchyFactorLimit } from "../memotron/node/node.store";
  const dispatch = createEventDispatcher();
  export let node: INode | undefined = undefined;
  export let md: IMarkdown;
  /**
   * @readonly
   * List of all blocks with their structure i.e. children parsed from the markdown
   */
  export let childrenWithStructure: INodeStructure[] = [];
  /**
   * @readonly
   * The list of block ids in the root of the markdown - to maintain the structure of the root markdown and propagate the changes
   */
  export let rootStructure: string[] | undefined = undefined;
  export let mdId: string;
  export let isNodular: boolean = node != undefined;
  export let changePropagationMethod: MdChangePropagationType =
    MdChangePropagationType.DEFERRED;
  let _md: IMarkdown;
  /**
   * @deprecated - children structure determination trail 1
   */
  let hierarchyV1: INodeHierarchyV1[] = [];
  /**
   * @readonly
   */
  let focusedBlock: string | undefined = undefined;
  let anchorBlock: string | undefined = undefined;
  if (node) {
    _md = { blocks: recursivelyExtractAllChildrenIntoArray(node) };
  } else {
    _md = md;
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

  function extractStructureForChildren(blocks: IMarkdown): INodeStructure[] {
    let hierarchy: INodeStructure[] = [];
    let collapsedHierarchy: INodeStructure[] = [];
    hierarchy = blocks.blocks.map((block) => {
      return {
        id: block.id,
        factor: resolveFactor(block.contentType as NodeType),
        children: []
      };
    });
    let leftovers: INodeStructure[] = [...hierarchy];
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
      const item = hierarchy.find((x) => x.id === block.id);
      if (item) item.children = block.children;
    });
    console.log({ collapsedHierarchy, hierarchy });
    return hierarchy;
  }
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
  function reCalculateStructure(md: IMarkdown) {
    const result = extractStructureForChildren(md);
    if (!focusedBlock) childrenWithStructure = result;
    else {
      const remaining = childrenWithStructure.filter((block) => {
        return !result.some((y) => y.id === block.id);
      });
      childrenWithStructure = [...remaining, ...result];
    }
    rootStructure = extractRootStructure().map((x) => x.id);
    //TODO - if focused - propagate only children of the focusedNode
    dispatch("restructure", {
      root: rootStructure,
      children: childrenWithStructure
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
  function mergeFocusedMd(focusedMd: IMarkdown) {
    //TODO - merge focusedMd into md using anchorBlock and focusedBlock
    return focusedMd;
  }
  function propagateChanges(updatedMd: IMarkdown) {
    if (!focusedBlock) md = updatedMd;
    else md = mergeFocusedMd(updatedMd);
  }
  function onBlockChanges(event: any) {
    // console.log("onBlockChanges", { event });
    const detail = event.detail;
    if (changePropagationMethod === MdChangePropagationType.IMMEDIATE) {
      //TODO - dispatch update event - node in scope
    }
    propagateChanges(detail.md);
    dispatch("change", { md, block: detail });
  }
  function resolveAnchorBlock(focusedBlock: string) {
    const index = childrenWithStructure.findIndex((x) => x.id === focusedBlock);
    const factor = childrenWithStructure.find(
      (x) => x.id === focusedBlock
    )?.factor;
    if (!factor) return;
    const succeedingBlocks = childrenWithStructure.splice(index + 1);
    const anchorBlock = succeedingBlocks.find((b) => b.factor <= factor);
    return anchorBlock?.id;
  }
  function onBlockFocus(event: any) {
    console.log("onBlockFocus", event);
    propagateChanges(event.detail.md);
    focusedBlock = event.detail.id;
    if (focusedBlock) anchorBlock = resolveAnchorBlock(focusedBlock);
    // TODO - filter _md
  }
</script>

<Markdown
  bind:md={_md}
  id={mdId}
  params={{
    isNodular,
    placeholder: "Start typing or choose a type to get started...",
    canUseSlashShortcut: true,
    isReadOnly: false
  }}
  on:change={onBlockChanges}
  on:insert={onBlockInsertV2}
  on:convert={onBlockConvert}
  on:focus={onBlockFocus}
  on:delete={onBlockDelete}
/>

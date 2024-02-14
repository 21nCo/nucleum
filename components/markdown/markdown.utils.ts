import {
  MdContext,
  type Block,
  type MdStore,
  type NodeMarkdown,
  type ListChild,
  type ListContent,
  type ListBlockWithChildren
} from "$lib/tidy/types/md.type";
import { deepCopy } from "$lib/tidy/utils/obj.utils";

/**
 * Recursively extracts all children of a node and its children. Useful for converting a nested structure of node into a flat array.
 * @param md Node markdown with children in each node
 * @returns children of the node and all its children
 */
export function recursivelyExtractAllChildrenIntoArray(md: NodeMarkdown) {
  let children: Block[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push({
        content: child.content,
        id: child.id,
        childrenHierarchy: child.childrenHierarchy
      });
      children.push(...recursivelyExtractAllChildrenIntoArray(child));
    });
  }
  return children;
}

export function parseBlocksIntoNestedMd(mdStore: MdStore) {
  const md = deepCopy(mdStore.md);
  md.children = recursivelyFormParentFromChildren(
    mdStore.blocks,
    md.childrenHierarchy
  );
  return md;
}

export function recursivelyFormParentFromChildren(
  blocks: Block[],
  childrenHierarchy: string[] | undefined
) {
  let children: NodeMarkdown[] = [];
  if (childrenHierarchy && childrenHierarchy.length > 0) {
    childrenHierarchy.forEach((childId) => {
      const child = blocks.find((b) => b.id === childId);
      if (child) {
        const newChild: NodeMarkdown = {
          ...child,
          children: recursivelyFormParentFromChildren(
            blocks,
            child.childrenHierarchy
          )
        };
        children.push(newChild);
      }
    });
  }
  return children;
}

export function handleNodeMarkdownChildHierarchyChanges(
  n: MdStore,
  contextBlockId: string,
  newBlock: Block,
  isStructuralBlock: boolean
) {
  if (n.context != MdContext.NODE) return n;
  const parent = n.blocks.find((b) =>
    b.childrenHierarchy?.includes(contextBlockId)
  );
  if (parent && parent.childrenHierarchy) {
    const previousSiblingIndexInParentContext =
      parent.childrenHierarchy.findIndex((c) => c === contextBlockId);
    parent.childrenHierarchy = [
      ...parent.childrenHierarchy.slice(
        0,
        isStructuralBlock
          ? previousSiblingIndexInParentContext
          : previousSiblingIndexInParentContext + 1
      ),
      newBlock.id,
      ...parent.childrenHierarchy.slice(
        isStructuralBlock
          ? previousSiblingIndexInParentContext
          : previousSiblingIndexInParentContext + 1
      )
    ];
  }
  return n;
}

/**
 * Iterator function to find the child that matches the childId to ultimately arrive at the deep nesting and insert the new block
 * @param block parent block
 * @param childId the id of the child to find
 * @returns blocks of the child that matches the childId
 */
function getChild(block: ListBlockWithChildren, childId: string) {
  return block.content.children.find((b) => b.id === childId) as ListChild<
    Required<Pick<ListContent, "children">>
  >;
}

export function resolveImmediateParent(
  mdBlocks: Block[],
  parentHierarchy: string[]
) {
  const topMostParentId = parentHierarchy.shift();
  const topMostParent = mdBlocks.find((b) => b.id === topMostParentId);
  let iterParent: ListBlockWithChildren = topMostParent as Block<
    Required<Pick<ListContent, "children">>
  >;
  let parentOneAbove: ListBlockWithChildren | undefined = undefined;
  parentHierarchy.forEach((item, index) => {
    parentOneAbove = iterParent;
    iterParent = getChild(iterParent, item);
  });
  return { parent: iterParent, parentOneAbove };
}

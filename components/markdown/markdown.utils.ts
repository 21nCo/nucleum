import type {
  Block,
  MdStore,
  ListBlockWithChildren
} from "$lib/tidy/types/md.type";
import type { ListChild, ListContent, Node } from "$lib/tidy/types/node.type";
import { deepCopy } from "$lib/tidy/utils/obj.utils";

/**
 * Recursively extracts all children of a node and its children. Useful for converting a nested structure of node into a flat array.
 * @param md Node markdown with children in each node
 * @returns children of the node and all its children
 */
export function recursivelyExtractAllChildrenIntoArray(md: Node) {
  let children: Block[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push(child);
      children.push(...recursivelyExtractAllChildrenIntoArray(child));
    });
  }
  return children;
}

export function parseBlocksIntoNestedMd(mdStore: MdStore) {
  const md = deepCopy(mdStore.node);
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
  let children: Node[] = [];
  if (childrenHierarchy && childrenHierarchy.length > 0) {
    childrenHierarchy.forEach((childId) => {
      const child = blocks.find((b) => b.id === childId);
      if (child) {
        const newChild: Node = {
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
  if (!n.params?.isNodular) return n;
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
  return block.children.find((b) => b.id === childId) as ListChild<
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
  let parentOneAbove: ListBlockWithChildren | undefined;
  parentHierarchy.forEach((item, index) => {
    parentOneAbove = iterParent;
    iterParent = getChild(iterParent, item);
  });
  return { parent: iterParent, parentOneAbove };
}

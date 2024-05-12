import {
  NodeType,
  type Node,
  ListType,
  type ListChild,
  type TextNodeType,
  type ListContent,
  type TextContent,
  type LayoutContent,
  type StructuralContent,
  type NodeContent,
  type StructuralNodeType
} from "$lib/tidy/types/node.type";

import {
  deepCopy,
  isEmptyArray,
  isValidArrayWithData
} from "$lib/tidy/utils/obj.utils";
import { generateMarkdownText } from "$lib/tidy/utils/text.utils";
import { generateUID } from "$lib/tidy/utils/utils";
import { get, writable } from "svelte/store";
import {
  handleNodeMarkdownChildHierarchyChanges,
  recursivelyExtractAllChildrenIntoArray,
  resolveImmediateParent
} from "./markdown.utils";
import type {
  Block,
  MdParams,
  MdStore,
  Markdown
} from "$lib/tidy/types/md.type";

export const emptyBlock: Block = {
  contentType: NodeType.SIMPLE_TEXT,
  body: "",
  id: generateUID()
};
export const emptyNode: Node = {
  children: [],
  contentType: NodeType.NON_NODULAR_MARKDOWN,
  body: {
    blocks: [emptyBlock]
  },
  avatar: "",
  id: generateUID()
};
const seedMdStore: MdStore = {
  node: emptyNode,
  blocks: []
};

export const mdContentChangeEvent = initMdContentChangeEvent();

function initMdContentChangeEvent() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    trigger: () => set(!get(mdContentChangeEvent))
  };
}
type MdStoreType = ReturnType<typeof initMarkdownStore>;
export const mdStores = new Map<string, MdStoreType>();
export function getMdStore(id: string) {
  if (!mdStores.has(id)) {
    mdStores.set(id, initMarkdownStore());
  }
  return mdStores.get(id)!;
}

function initMarkdownStore() {
  const { subscribe, set, update } = writable<MdStore>(seedMdStore);

  function load(md: Node | Markdown, params: MdParams | undefined = undefined) {
    if ("blocks" in md) {
      set({
        node: undefined,
        params,
        blocks: md.blocks,
        blockToFocus: md.blocks?.[0]?.id
      });
    } else
      set({
        node: md,
        params,
        blocks: recursivelyExtractAllChildrenIntoArray(md),
        blockToFocus: md.children?.[0]?.id
      });
  }

  /**
   * Inserts a new block after the context block
   * @param contextBlockId block to insert the new block after
   * @param params block type to insert, defaults to simple text
   */
  function insert(
    contextBlockId: string,
    params: { blockType?: NodeType; listType?: ListType } = {
      blockType: NodeType.SIMPLE_TEXT,
      listType: ListType.UNORDERED
    }
  ) {
    update((n) => {
      const contextBlockIndex = n.blocks.findIndex(
        (b) => b.id === contextBlockId
      );
      let newBlock: Block<NodeContent>;
      if (
        params.blockType &&
        params.blockType != NodeType.LIST &&
        params.blockType != NodeType.NODULAR_MARKDOWN
      ) {
        newBlock = {
          id: generateUID(),
          contentType: params.blockType ?? NodeType.SIMPLE_TEXT,
          body: ""
        } as Block<TextContent | LayoutContent | StructuralContent>;
      } else if (params.blockType === NodeType.LIST) {
        newBlock = {
          id: generateUID(),
          contentType: NodeType.LIST,
          listType: params.listType ?? ListType.UNORDERED,
          body: ""
        };
      } else {
        newBlock = {
          id: generateUID(),
          contentType: NodeType.SIMPLE_TEXT,
          body: ""
        };
      }
      if (!newBlock) return n;
      n.blocks = [
        ...n.blocks.slice(0, contextBlockIndex + 1),
        newBlock,
        ...n.blocks.slice(contextBlockIndex + 1)
      ];
      n.blockToFocus = newBlock.id;
      n = handleNodeMarkdownChildHierarchyChanges(
        n,
        contextBlockId,
        newBlock,
        true
      );
      return n;
    });
  }
  /**
   * Inserts a structural block after the context block
   * @param contextBlockId block to insert the new block after
   * @param blockType type of structural block to insert
   */
  function insertStructualBlock(
    contextBlockId: string,
    blockType: StructuralNodeType
  ) {
    update((n) => {
      const contextBlockIndex = n.blocks.findIndex(
        (b) => b.id === contextBlockId
      );
      const newBlock: Block<StructuralContent> = {
        id: generateUID(),
        contentType: blockType
      };
      n.blocks = [
        ...n.blocks.slice(0, contextBlockIndex),
        newBlock,
        ...n.blocks.slice(contextBlockIndex)
      ];
      n.blockToFocus = newBlock.id;
      n = handleNodeMarkdownChildHierarchyChanges(
        n,
        contextBlockId,
        newBlock,
        true
      );
      return n;
    });
  }
  /**
   * Handles insert operations for lists which are already present
   * @param contextId the id of the block to insert the new block after
   * @param parentHierarchy the hierarchy of the parents of the list item
   */
  function handleInsertForExistingList(
    contextId: string,
    parentHierarchy: string[]
  ) {
    update((n) => {
      if (parentHierarchy.length === 0) {
        const { blocks, id } = handleInsertion(n.blocks);
        n.blocks = blocks;
        n.blockToFocus = id;
        return n;
      }
      const { parent } = resolveImmediateParent(n.blocks, parentHierarchy);
      if (!parent || !("children" in parent) || !parent.children) return n;
      const { blocks, id } = handleInsertion(parent.children);
      parent.children = blocks;
      n.reRenderBlock = parentHierarchy[0];
      n.blockToFocus = id;
      return n;

      /**
       * Handles the insertion of a new block in the context of a list
       * @param blocks the blocks to insert into
       * @returns the new blocks and the id of the new block
       */
      function handleInsertion(
        blocks: Block<NodeContent>[] | ListChild<NodeContent>[]
      ) {
        const contextBlockIndex = blocks.findIndex((b) => b.id === contextId);
        const currentBlock = blocks[contextBlockIndex];
        let newBlock: Block<ListContent> = {
          id: generateUID(),
          contentType: NodeType.LIST,
          listType: ListType.UNORDERED,
          body: "",
          children: []
        };
        if (
          "children" in currentBlock &&
          "children" in newBlock &&
          isValidArrayWithData(currentBlock.children)
        ) {
          const currentListItemChildren = currentBlock.children;
          newBlock.children = currentListItemChildren;
          currentBlock.children = [];
        }
        let blocksWithoutCurrent = [
          ...blocks.slice(0, contextBlockIndex),
          ...blocks.slice(contextBlockIndex + 1)
        ];
        blocks = [
          ...blocksWithoutCurrent.slice(0, contextBlockIndex),
          currentBlock,
          newBlock,
          ...blocksWithoutCurrent.slice(contextBlockIndex)
        ];
        return { blocks, id: newBlock.id };
      }
    });
  }

  /**
   * Converts a block of one type to another
   * @param id id of the block which needs to be converted
   * @param params blockType to which the block needs to be converted and listType if the convertion is list
   * @returns a boolean that states conversion is successful or not
   */
  function convert(
    id: string,
    params: {
      blockType: NodeType.LIST | TextNodeType;
      listType?: ListType;
    } = {
      blockType: NodeType.SIMPLE_TEXT,
      listType: ListType.UNORDERED
    }
  ) {
    update((n) => {
      const block = n.blocks.find((b) => b.id === id);
      if (block && "body" in block) {
        block.contentType = params.blockType;
        if (params.blockType === NodeType.LIST) {
          (block as ListContent).listType =
            params.listType ?? ListType.UNORDERED;
          (block as ListContent).body = "";
        } else {
          block.body = "";
        }
      }
      n.blockToFocus = id;
      return n;
    });
    return true;
  }

  function listOperation(
    operation: string,
    id: string,
    parentHierarchy: string[]
  ) {
    const parentHierarchyCopy = deepCopy(parentHierarchy);
    if (isEmptyArray(parentHierarchy) && operation === "shifttab") return false;
    if (isEmptyArray(parentHierarchy) && operation === "tab") {
      update((n) => {
        const currentBlockIndex = n.blocks.findIndex((b) => b.id === id);
        let previousSibling = n.blocks[currentBlockIndex - 1];
        if (previousSibling.contentType != NodeType.LIST) return n;
        const currentBlock = { ...n.blocks[currentBlockIndex] };
        previousSibling = moveAsChild(
          currentBlock,
          previousSibling as Block<ListContent>
        );
        n.blocks = n.blocks.filter((b) => b.id !== id);
        //n.reRenderBlock = previousSibling.id;
        n.blockToFocus = id;
        return n;
      });
    } else if (operation === "tab") {
      update((n) => {
        const { parent } = resolveImmediateParent(n.blocks, parentHierarchy);
        const currentBlockIndex = parent.children.findIndex((b) => b.id === id);
        if (!currentBlockIndex || currentBlockIndex === 0) return n;
        let previousSibling = parent.children[currentBlockIndex - 1];
        previousSibling = moveAsChild(
          parent.children[currentBlockIndex],
          previousSibling as ListChild<ListContent>
        );
        parent.children = parent.children.filter((b) => b.id !== id);
        //n.reRenderBlock = parentHierarchyCopy[0];
        n.blockToFocus = id;
        return n;
      });
    } else if (operation === "shifttab") {
      update((n) => {
        const { parent, parentOneAbove } = resolveImmediateParent(
          n.blocks,
          parentHierarchy
        );
        const currentBlock = parent.children.find(
          (b) => b.id === id
        ) as ListChild;
        parent.children = parent.children.filter((b) => b.id !== id);
        if (!parentOneAbove) {
          console.log("parentOneAbove not present", parentOneAbove);
          const parentIndex = n.blocks.findIndex((b) => b.id === parent.id);
          n.blocks = [
            ...n.blocks.slice(0, parentIndex + 1),
            currentBlock,
            ...n.blocks.slice(parentIndex + 1)
          ];
          n.blockToFocus = id;
        } else {
          let blocksInScope: ListChild[] = (
            parentOneAbove as ListChild<ListContent>
          ).children!;
          const parentIndex = blocksInScope.findIndex(
            (b) => b.id === parent.id
          );
          console.log({ blocksInScope, parentIndex });
          blocksInScope = [
            ...blocksInScope.slice(0, parentIndex + 1),
            currentBlock,
            ...blocksInScope.slice(parentIndex + 1)
          ];
          parentOneAbove.children = blocksInScope;
          n.blockToFocus = id;
        }
        return n;
      });
    }
    return true;

    /**
     * Moves the current block as a child of the parent block
     * @param blockToBeMoved the block that needs to be moved as a child
     * @param parent the parent block under which the current block needs to be moved
     * @returns the parent block with the current block moved as a child
     */
    function moveAsChild(
      blockToBeMoved: Block | ListChild,
      parent: Block<ListContent> | ListChild<ListContent>
    ) {
      if (!parent.children) parent.children = [];
      parent.children = [...parent.children, blockToBeMoved];
      return parent;
    }
  }

  return {
    subscribe,
    load,
    insert,
    convert,
    reset: () => set(seedMdStore),
    insertStructualBlock,
    handleInsertForExistingList,
    listOperation,
    deleteBlock: (id: string) => {
      update((n) => {
        const deleteIndex = n.blocks.findIndex((b) => b.id === id);
        n.blocks = n.blocks.filter((b) => b.id !== id);
        if (deleteIndex) n.blockToFocus = n.blocks[deleteIndex - 1].id;
        return n;
      });
    },
    focusPreviousSibling: (id: string) => {
      update((n) => {
        const contextIndex = n.blocks.findIndex((b) => b.id === id);
        n.blockToFocus = n.blocks[contextIndex - 1].id;
        return n;
      });
    },
    focusBlock: (id: string) => {
      update((n) => {
        n.blockToFocus = id;
        return n;
      });
    },
    generateMarkdownText: () => {
      let text = "";
      update((n) => {
        const blocks: Block[] = deepCopy(n.blocks);
        text = generateMarkdownText(blocks);
        return n;
      });
      return text;
    },
    isFirstBlockAndIsEmpty: (id: string) => {
      let isFirstBlock = false;
      let isEmpty = false;
      update((n) => {
        const firstBlock = n.blocks[0];
        isFirstBlock = firstBlock.id === id;
        if (isFirstBlock) {
          if (firstBlock.contentType === NodeType.SIMPLE_TEXT) {
            isEmpty = !firstBlock.body;
          } else if (firstBlock.contentType === NodeType.LIST) {
            isEmpty = !firstBlock.children || !firstBlock.children.length;
          }
        }
        return n;
      });
      return isFirstBlock && isEmpty;
    }
    //Not required for simple markdown editor - can save blocks instead of nested md
    // fetchAsNestedMd: () => {
    //   const n = get(mdStore);
    //   return parseBlocksIntoNestedMd(n);
    // },
  };
}

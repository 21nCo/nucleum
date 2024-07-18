import {
  NodeType,
  ListType,
  type ListChild,
  type TextNodeType,
  type ListContent,
  type TextContent,
  type LayoutContent,
  type StructuralContent,
  type NodeContent,
  type StructuralNodeType
} from "$lib/client/types/memotron/node.type";

import {
  deepCopy,
  isEmptyArray,
  isValidArrayWithData
} from "$lib/shared/utils/obj.utils";
import {
  generateMarkdownText,
  prefixTable
} from "$lib/client/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { get, writable, type Updater } from "svelte/store";
import {
  handleNodeMarkdownChildHierarchyChanges,
  resolveImmediateParent
} from "./markdown.utils";
import type {
  IBlock,
  IMarkdownParams,
  IMarkdownStore,
  IMarkdown,
  IListOperation,
  IBlockOperationContext
} from "$lib/client/types/memotron/md.type";
import { Item } from "$lib/client/types/item.enum";

export const emptyBlock: IBlock = {
  contentType: NodeType.SIMPLE_TEXT,
  body: "",
  id: generateUID()
};
const seedMdStore: IMarkdownStore = {
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
export type MdStoreType = ReturnType<typeof initMarkdownStore>;
export const mdStores = new Map<string, MdStoreType>();
export function getMdStore(id: string) {
  if (!mdStores.has(id)) {
    mdStores.set(id, initMarkdownStore());
  }
  return mdStores.get(id)!;
}

function loadMdStore(
  setter: (this: void, value: IMarkdownStore) => void,
  md: IMarkdown,
  params: IMarkdownParams | undefined = undefined
) {
  setter({
    params,
    blocks: md.blocks,
    blockToFocus: md.blocks?.[0]?.id
  });
}
/**
 * Inserts a new block after the context block
 * @param contextBlockId block to insert the new block after
 * @param params block type to insert, defaults to simple text
 */
function insertBlock(
  updater: (this: void, updater: Updater<IMarkdownStore>) => void,
  params: IBlockOperationContext
) {
  const { id, blockType, listType } = params;
  let newBlock: Partial<IBlock<NodeContent>> = {
    id: prefixTable(generateUID(), Item.node),
    body: ""
  };
  if (
    params.blockType &&
    params.blockType != NodeType.LIST &&
    params.blockType != NodeType.NODULAR_MARKDOWN
  ) {
    newBlock = {
      ...newBlock,
      contentType: params.blockType ?? NodeType.SIMPLE_TEXT
    } as IBlock<TextContent | LayoutContent | StructuralContent>;
  } else if (params.blockType === NodeType.LIST) {
    newBlock = {
      ...newBlock,
      contentType: NodeType.LIST,
      listType: params.listType ?? ListType.UNORDERED
    };
  } else {
    newBlock = {
      ...newBlock,
      contentType: NodeType.SIMPLE_TEXT
    };
  }
  updater((store) => {
    const contextBlockIndex = store.blocks.findIndex((b) => b.id === id);
    if (!newBlock) return store;
    store.blocks = [
      ...store.blocks.slice(0, contextBlockIndex + 1),
      newBlock,
      ...store.blocks.slice(contextBlockIndex + 1)
    ];
    store.blockToFocus = newBlock.id;
    // store = handleNodeMarkdownChildHierarchyChanges(store, id, newBlock, true);
    return store;
  });
  return newBlock.id;
}

/**
 * Inserts a structural block after the context block
 * @param contextBlockId block to insert the new block after
 * @param blockType type of structural block to insert
 */
function insertStructualBlock(
  updater: (this: void, updater: Updater<IMarkdownStore>) => void,
  contextBlockId: string,
  blockType: StructuralNodeType
) {
  updater((store) => {
    const contextBlockIndex = store.blocks.findIndex(
      (b) => b.id === contextBlockId
    );
    const newBlock: IBlock<StructuralContent> = {
      id: prefixTable(generateUID(), Item.node),
      contentType: blockType
    };
    store.blocks = [
      ...store.blocks.slice(0, contextBlockIndex),
      newBlock,
      ...store.blocks.slice(contextBlockIndex)
    ];
    store.blockToFocus = newBlock.id;
    // store = handleNodeMarkdownChildHierarchyChanges(
    //   store,
    //   contextBlockId,
    //   newBlock,
    //   true
    // );
    return store;
  });
}
/**
 * Handles insert operations for lists which are already present
 * @param contextId the id of the block to insert the new block after
 * @param parentHierarchy the hierarchy of the parents of the list item
 */
function handleInsertForExistingList(
  updater: (this: void, updater: Updater<IMarkdownStore>) => void,
  contextId: string,
  parentHierarchy: string[]
) {
  updater((store) => {
    if (parentHierarchy.length === 0) {
      const { blocks, id } = handleInsertion(store.blocks);
      store.blocks = blocks;
      store.blockToFocus = id;
      return store;
    }
    const { parent } = resolveImmediateParent(store.blocks, parentHierarchy);
    if (!parent || !("children" in parent) || !parent.children) return store;
    const { blocks, id } = handleInsertion(parent.children);
    parent.children = blocks;
    store.reRenderBlock = parentHierarchy[0];
    store.blockToFocus = id;
    return store;

    /**
     * Handles the insertion of a new block in the context of a list
     * @param blocks the blocks to insert into
     * @returns the new blocks and the id of the new block
     */
    function handleInsertion(
      blocks: IBlock<NodeContent>[] | ListChild<NodeContent>[]
    ) {
      const contextBlockIndex = blocks.findIndex((b) => b.id === contextId);
      const currentBlock = blocks[contextBlockIndex];
      let newBlock: IBlock<ListContent> = {
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
  updater: (this: void, updater: Updater<IMarkdownStore>) => void,
  params: IBlockOperationContext
) {
  if (!params.blockType || !params.id) return false;
  updater((n) => {
    const block = n.blocks.find((b) => b.id === params.id);
    if (block && "body" in block) {
      block.contentType = params.blockType;
      if (params.blockType === NodeType.LIST) {
        (block as ListContent).listType = params.listType ?? ListType.UNORDERED;
        (block as ListContent).body = "";
      } else {
        block.body = "";
      }
    }
    n.blockToFocus = params.id;
    return n;
  });
  return true;
}

function listOperation(
  updater: (this: void, updater: Updater<IMarkdownStore>) => void,
  params: IListOperation
) {
  const { operation, id, parentHierarchy } = params;
  const parentHierarchyCopy = deepCopy(parentHierarchy);
  if (isEmptyArray(parentHierarchy) && operation === "shifttab") return false;
  if (isEmptyArray(parentHierarchy) && operation === "tab") {
    updater((n) => {
      const currentBlockIndex = n.blocks.findIndex((b) => b.id === id);
      let previousSibling = n.blocks[currentBlockIndex - 1];
      if (previousSibling.contentType != NodeType.LIST) return n;
      const currentBlock = { ...n.blocks[currentBlockIndex] };
      previousSibling = moveAsChild(
        currentBlock,
        previousSibling as IBlock<ListContent>
      );
      n.blocks = n.blocks.filter((b) => b.id !== id);
      //n.reRenderBlock = previousSibling.id;
      n.blockToFocus = id;
      return n;
    });
  } else if (operation === "tab") {
    updater((n) => {
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
    updater((n) => {
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
        const parentIndex = blocksInScope.findIndex((b) => b.id === parent.id);
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
    blockToBeMoved: IBlock | ListChild,
    parent: IBlock<ListContent> | ListChild<ListContent>
  ) {
    if (!parent.children) parent.children = [];
    parent.children = [...parent.children, blockToBeMoved];
    return parent;
  }
}

function initMarkdownStore() {
  const { subscribe, set, update } = writable<IMarkdownStore>(seedMdStore);
  return {
    subscribe,
    load: (md: IMarkdown, params: IMarkdownParams) =>
      loadMdStore(set, md, params),
    insert: (params: IBlockOperationContext) => insertBlock(update, params),
    convert: (params: IBlockOperationContext) => convert(update, params),
    reset: () => set(seedMdStore),
    insertStructualBlock: (
      contextBlockId: string,
      blockType: StructuralNodeType
    ) => insertStructualBlock(update, contextBlockId, blockType),
    handleInsertForExistingList: (
      contextId: string,
      parentHierarchy: string[]
    ) => handleInsertForExistingList(update, contextId, parentHierarchy),
    listOperation: (params: IListOperation) => listOperation(update, params),
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
        const blocks: IBlock[] = deepCopy(n.blocks);
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

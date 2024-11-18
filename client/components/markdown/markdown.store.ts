import {
  NodeType,
  ListType,
  type ListChild,
  type ListContent,
  type TextContent,
  type LayoutContent,
  type StructuralContent,
  type NodeContent,
  type StructuralNodeType
} from "$lib/client/products/memotron/node/node.type";

import {
  deepCopy,
  isEmptyArray,
  isValidArrayWithData
} from "$lib/shared/utils/obj.utils";
import { get, writable, type Updater } from "svelte/store";
import { resolveImmediateParent } from "./markdown.utils";
import {
  type IBlockInterface,
  type IMarkdownParams,
  type IMarkdownStore,
  type IMarkdown,
  type IListOperation,
  type IBlockOperationContext,
  BlockAction,
  type IListBlockBody,
  type IListBlock,
  type IBlock
} from "$lib/client/components/markdown/md.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import {
  isSameResource,
  resourceInList
} from "../flux/resourceStores/resource.utils";
import { logger } from "../debug/logger.client";

/**
 * Used to identify if temporary s3 storage should be used or not, If true, temporary s3 storage is used
 */
export const isReplaceableMd = writable<boolean>(false);
export const emptyBlock: IBlockInterface = {
  contentType: NodeType.SIMPLE_TEXT,
  body: "",
  id: generateResourceId(Resource.node)
};
const seedMdStore: IMarkdownStore = {
  blocks: [],
  activeHeading: ""
};

export const mdContentChangeEvent = initMdContentChangeEvent();

function initMdContentChangeEvent() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    trigger: () => set(!get(mdContentChangeEvent))
  };
}
export type MdStoreType = InstanceType<typeof MarkdownStore>;
export const mdStores = new Map<string, MdStoreType>();
export function getMdStore(id: string) {
  if (!mdStores.has(id)) {
    mdStores.set(id, new MarkdownStore());
  }
  return mdStores.get(id)!;
}

class MarkdownStore extends ObservableStore<IMarkdownStore> {
  focus = writable<
    | { id?: IRecordId; params?: { xOffset?: number; isBottom?: boolean } }
    | undefined
  >(undefined);
  constructor() {
    super("markdownStore");
    this.set(seedMdStore);
  }

  reset() {
    this.set(seedMdStore);
  }

  load(md: IMarkdown, params: IMarkdownParams) {
    this.set({
      params,
      blocks: md.blocks,
      activeHeading: ""
    });
    this.focus.set({ id: md.blocks?.[0]?.id });
  }

  /**
   * Inserts a new block after the context block
   * @param contextBlockId block to insert the new block after
   * @param params block type to insert, defaults to simple text
   */
  insert(params: IBlockOperationContext) {
    logger.log({ at: "MarkdownStore - insert", params });
    let newBlock: Partial<IBlock> = {
      id: generateResourceId(Resource.node),
      body: params.body ?? ""
    };
    if (params.blockType && params.blockType != NodeType.NODULAR_MARKDOWN) {
      newBlock = {
        ...newBlock,
        contentType: params.blockType ?? NodeType.SIMPLE_TEXT
      } as IBlock;
    } else {
      newBlock = {
        ...newBlock,
        contentType: NodeType.SIMPLE_TEXT
      };
    }
    this.update((store) => {
      const contextBlockIndex = store.blocks.findIndex(
        (b) => b.id === params.source
      );
      if (!newBlock) return store;
      store.blocks = [
        ...store.blocks.slice(0, contextBlockIndex + 1),
        newBlock,
        ...store.blocks.slice(contextBlockIndex + 1)
      ];
      this.focus.set({ id: newBlock.id });
      // store = handleNodeMarkdownChildHierarchyChanges(store, id, newBlock, true);
      return store;
    });
    return newBlock.id;
  }

  /**
   *
   * @deprecated - use convert propagation to Block component instead
   *
   * Converts a block of one type to another
   * @param id id of the block which needs to be converted
   * @param params blockType to which the block needs to be converted and listType if the convertion is list
   * @returns a boolean that states conversion is successful or not
   */
  convert(params: IBlockOperationContext) {
    if (!params.blockType || !params.source) return false;
    this.update((n) => {
      const block = n.blocks.find((b) => b.id === params.source);
      if (block && "body" in block) {
        block.contentType = params.blockType;
        if (params.blockType === NodeType.LIST) {
          (block as ListContent).listType =
            params.listType ?? ListType.UNORDERED;
          (block as ListContent).body = block.body;
        } else {
          block.body = "";
        }
      }
      this.focus.set({ id: params.source });
      return n;
    });
    return true;
  }

  /**
   * Inserts a structural block after the context block
   * @param contextBlockId block to insert the new block after
   * @param blockType type of structural block to insert
   */
  insertStructualBlock(
    contextBlockId: IRecordId,
    blockType: StructuralNodeType
  ) {
    const newBlockId = generateResourceId(Resource.node);
    this.update((store) => {
      const contextBlockIndex = store.blocks.findIndex(
        (b) => b.id === contextBlockId
      );
      const newBlock: IBlockInterface<StructuralContent> = {
        id: newBlockId,
        contentType: blockType
      };
      store.blocks = [
        ...store.blocks.slice(0, contextBlockIndex),
        newBlock,
        ...store.blocks.slice(contextBlockIndex)
      ];
      this.focus.set({ id: newBlock.id });
      // store = handleNodeMarkdownChildHierarchyChanges(
      //   store,
      //   contextBlockId,
      //   newBlock,
      //   true
      // );
      return store;
    });
    return newBlockId;
  }

  /**
   * @deprecated - used with ListContent v1
   * Handles insert operations for lists which are already present
   * @param contextId the id of the block to insert the new block after
   * @param parentHierarchy the hierarchy of the parents of the list item
   */
  handleInsertForExistingList(contextId: string, parentHierarchy: string[]) {
    this.update((store) => {
      if (parentHierarchy.length === 0) {
        const { blocks, id } = handleInsertion(store.blocks);
        store.blocks = blocks;
        this.focus.set({ id });
        return store;
      }
      const { parent } = resolveImmediateParent(store.blocks, parentHierarchy);
      if (!parent || !("children" in parent) || !parent.children) return store;
      const { blocks, id } = handleInsertion(parent.children);
      parent.children = blocks;
      store.reRenderBlock = parentHierarchy[0];
      this.focus.set({ id });
      return store;

      /**
       * Handles the insertion of a new block in the context of a list
       * @param blocks the blocks to insert into
       * @returns the new blocks and the id of the new block
       */
      function handleInsertion(
        blocks: IBlockInterface<NodeContent>[] | ListChild<NodeContent>[]
      ) {
        const contextBlockIndex = blocks.findIndex((b) => b.id === contextId);
        const currentBlock = blocks[contextBlockIndex];
        let newBlock: IBlockInterface<ListContent> = {
          id: generateResourceId(Resource.node),
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
   * @deprecated - used with ListContent v1
   * @param params
   * @returns
   */
  listOperation(params: IListOperation) {
    const { operation, id, parentHierarchy } = params;
    const parentHierarchyCopy = deepCopy(parentHierarchy);
    if (isEmptyArray(parentHierarchy) && operation === "shifttab") return false;
    if (isEmptyArray(parentHierarchy) && operation === "tab") {
      this.update((n) => {
        const currentBlockIndex = n.blocks.findIndex((b) => b.id === id);
        let previousSibling = n.blocks[currentBlockIndex - 1];
        if (previousSibling.contentType != NodeType.LIST) return n;
        const currentBlock = { ...n.blocks[currentBlockIndex] };
        previousSibling = moveAsChild(
          currentBlock,
          previousSibling as IBlockInterface<ListContent>
        );
        n.blocks = n.blocks.filter((b) => b.id !== id);
        //n.reRenderBlock = previousSibling.id;
        return n;
      });
    } else if (operation === "tab") {
      this.update((n) => {
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
        return n;
      });
    } else if (operation === "shifttab") {
      this.update((n) => {
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
        }
        return n;
      });
    }
    this.focus.set({ id });
    return true;

    /**
     * Moves the current block as a child of the parent block
     * @param blockToBeMoved the block that needs to be moved as a child
     * @param parent the parent block under which the current block needs to be moved
     * @returns the parent block with the current block moved as a child
     */
    function moveAsChild(
      blockToBeMoved: IBlockInterface | ListChild,
      parent: IBlockInterface<ListContent> | ListChild<ListContent>
    ) {
      if (!parent.children) parent.children = [];
      parent.children = [...parent.children, blockToBeMoved];
      return parent;
    }
  }

  deleteBlock(id: IRecordId) {
    this.update((n) => {
      const deleteIndex = n.blocks.findIndex((b) => b.id === id);
      n.blocks = n.blocks.filter((b) => b.id !== id);
      if (deleteIndex) this.focus.set({ id: n.blocks[deleteIndex - 1].id });
      return n;
    });
  }

  shiftFocus(
    id: IRecordId,
    direction: "up" | "down",
    params?: { xOffset?: number }
  ) {
    this.update((n) => {
      const contextIndex = n.blocks.findIndex((b) => b.id === id);
      if (contextIndex === -1) return n;
      const siblingIndex =
        direction === "up" ? contextIndex - 1 : contextIndex + 1;
      if (siblingIndex < 0 || siblingIndex > n.blocks.length - 1) return n;
      this.focus.set({
        id: n.blocks[siblingIndex].id,
        params: {
          ...params,
          isBottom: direction === "up"
        }
      });
      return n;
    });
  }

  move(id: IRecordId, direction: BlockAction.MOVEUP | BlockAction.MOVEDOWN) {
    let changedBlocks: IListBlock[] = [];
    this.update((n) => {
      const contextIndex = n.blocks.findIndex((b) => b.id === id);
      if (contextIndex === -1) return n;
      const siblingIndex =
        direction === BlockAction.MOVEUP ? contextIndex - 1 : contextIndex + 1;
      if (siblingIndex < 0 || siblingIndex > n.blocks.length - 1) return n;
      const currentBlock = n.blocks[contextIndex];
      const siblingBlock = n.blocks[siblingIndex];
      if (currentBlock.contentType === NodeType.ORDERED_LIST) {
        if (
          siblingBlock.contentType !== NodeType.ORDERED_LIST ||
          siblingBlock.body.indent !== currentBlock.body.indent
        )
          return n;
        const currentOrder = currentBlock.body.order;
        currentBlock.body.order = siblingBlock.body.order;
        siblingBlock.body.order = currentOrder;
        changedBlocks.push(currentBlock, siblingBlock);
      }
      n.blocks[contextIndex] = siblingBlock;
      n.blocks[siblingIndex] = currentBlock;
      return n;
    });
    this.focus.set({ id });
    return changedBlocks;
  }

  duplicate(id: IRecordId) {
    let newBlock: IBlockInterface;
    const md = this.get();
    const contextIndex = md.blocks.findIndex((b) => b.id === id);
    if (contextIndex === -1) return;
    const currentBlock = md.blocks[contextIndex];
    newBlock = {
      ...currentBlock,
      id: generateResourceId(Resource.node)
    };
    this.update((n) => {
      n.blocks = [
        ...n.blocks.slice(0, contextIndex + 1),
        newBlock,
        ...n.blocks.slice(contextIndex + 1)
      ];
      return n;
    });
    this.focus.set({ id: newBlock.id });
    return newBlock;
  }

  /**
   *
   *
   * TODO - Move the content to the previous block, delete the current block and focus the previous block
   *
   * @param block
   */
  backspaceWithContent(block: IBlockInterface) {
    const { id, content } = block;
    this.update((n) => {
      const contextIndex = n.blocks.findIndex((b) => b.id === id);
      // n.blocks[contextIndex - 1].body =
      //   n.blocks[contextIndex - 1].body + content;
      // return n;
    });
  }

  focusBlock(id: string) {
    this.focus.set({ id });
  }

  isFirstBlockAndIsEmpty(id: IRecordId) {
    let isFirstBlock = false;
    let isEmpty = false;
    const md = this.get();
    const firstBlock = md.blocks[0];
    isFirstBlock = isSameResource(firstBlock, id);
    if (isFirstBlock) {
      if (md.blocks.length > 1) {
        isEmpty = false;
      } else if (firstBlock.contentType === NodeType.SIMPLE_TEXT) {
        isEmpty = !firstBlock.body;
      } else if (firstBlock.contentType === NodeType.LIST) {
        isEmpty = !firstBlock.children || !firstBlock.children.length;
      }
    }
    return isFirstBlock && isEmpty;
  }

  isLastBlock(id: IRecordId) {
    const md = this.get();
    return isSameResource(md.blocks[md.blocks.length - 1], id);
  }

  getPreviousSibling(id: IRecordId) {
    const md = this.get();
    const contextIndex = md.blocks.findIndex(resourceInList(id));
    return md.blocks[contextIndex - 1];
  }

  /**
   * Returns the parent of the block with the given id and the parent's indent is equal to the given indent
   * @param id id of the block to get the parent of
   * @param indent the indent of the parent
   * @returns the parent of the list block of type ordered list
   */
  getListParentOrdered(id: IRecordId, indent: number) {
    const md = this.get();
    let parent = getImmediateParent(id);
    while (parent && parent.body.indent !== indent) {
      parent = getImmediateParent(parent?.id);
    }
    return parent;

    function getImmediateParent(id: IRecordId | undefined) {
      if (!id) return undefined;
      const contextIndex = md.blocks.findIndex(resourceInList(id));
      const contextBlock = md.blocks[contextIndex];
      if (contextBlock.contentType !== NodeType.ORDERED_LIST) return undefined;
      for (let i = contextIndex; i >= 0; i--) {
        const block = md.blocks[i];
        if (
          block.contentType === NodeType.ORDERED_LIST &&
          block.body.indent < contextBlock.body.indent
        )
          return block;
      }
    }
  }

  reconcileOrderedList(
    id: IRecordId,
    body: IListBlockBody,
    action: BlockAction.TAB | BlockAction.SHIFT_TAB,
    replacedOrder: number
  ) {
    const md = this.get();
    const contextIndex = md.blocks.findIndex(resourceInList(id));
    const contextBlock = md.blocks[contextIndex];
    if (contextBlock.contentType !== NodeType.ORDERED_LIST) return;
    const succeedingBlock = md.blocks[contextIndex + 1];
    if (
      !succeedingBlock ||
      succeedingBlock.contentType !== NodeType.ORDERED_LIST
    )
      return;
    let changedBlocks: IListBlock[] = [];
    orderAll((body.order ?? 0) + 1, body.indent);
    if (succeedingBlock.body.indent > body.indent) {
      orderAll(1, succeedingBlock.body.indent);
    }
    if (action === BlockAction.TAB) {
      orderAll(replacedOrder, body.indent - 1);
    }
    this.update((n) => {
      n.blocks = n.blocks.map((b) => {
        if (changedBlocks.some(resourceInList(b.id)))
          return {
            ...b,
            body: { ...changedBlocks.find(resourceInList(b.id))?.body }
          };
        return b;
      });
      return n;
    });
    return changedBlocks;

    function orderAll(from: number, targetIndent: number) {
      const index = contextIndex + 1;
      for (let i = index; i < md.blocks.length; i++) {
        const block = md.blocks[i];
        if (
          block.contentType !== NodeType.ORDERED_LIST ||
          block.body.indent < targetIndent
        )
          break;
        if (block.body.indent !== targetIndent) continue;
        block.body.order = from++;
        changedBlocks.push(block);
      }
    }
  }
}

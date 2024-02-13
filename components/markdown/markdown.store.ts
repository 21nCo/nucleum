import {
  MdBlockType,
  type MdStore,
  SpanType,
  type NodeMarkdown,
  type Block,
  MdContext,
  type MdParams,
  ListType,
  type BasicMarkdown,
  type ListChild,
  type TextType
} from "$lib/tidy/types/md.type";
import { deepCopy, isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
import { generateMarkdownText } from "$lib/tidy/utils/text.utils";
import { generateUID } from "$lib/tidy/utils/utils";
import type { List } from "postcss/lib/list";
import { get, writable } from "svelte/store";
import {
  handleNodeMarkdownChildHierarchyChanges,
  recursivelyExtractAllChildrenIntoArray
} from "./markdown.utils";

export const sampleMd = {
  children: [
    {
      children: [
        {
          children: [],
          type: MdBlockType.SIMPLE_TEXT,
          content: "h1 1 text block",
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0"
        },
        {
          children: [
            {
              children: [],
              type: MdBlockType.SIMPLE_TEXT,
              content:
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              id: "mdtrail:2nf1gtuulr0yotuuipfs"
            },
            {
              children: [],
              type: MdBlockType.SIMPLE_TEXT,
              content: [
                {
                  type: SpanType.BOLD,
                  content:
                    "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
                  id: "mdtrail:2nf1gtuulr0yotuu "
                },
                {
                  type: SpanType.ITALIC,
                  content:
                    "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu",
                  id: "mdtrail:2nf1gtuulr0yotuuipf "
                },
                {
                  type: SpanType.UNDERLINE,
                  content: [
                    {
                      type: SpanType.DEFAULT,
                      content:
                        "fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est",
                      id: "mdtrail:2nf1gtuulr0yo"
                    },
                    {
                      type: SpanType.BOLD,
                      content: "reference",
                      id: "mdtrail:2nf1gtuulr0yot"
                    },
                    {
                      type: SpanType.CODE,
                      content: "code",
                      id: "mdtrail:2nf1gtuulr0yotu"
                    },
                    {
                      type: SpanType.DEFAULT,
                      content: "laborum.",
                      id: "mdtrail:2nf1gtuulr0yotuui"
                    }
                  ],
                  id: "mdtrail:2nf1gtuulr0yotuui"
                }
              ],
              id: "mdtrail:0i18cc5p90wdisg5rp4y"
            }
          ],
          type: MdBlockType.HEADING2,
          content: "h1 1 h2 1 block",
          id: "mdtrail:g8nzhoct35w996rvqers"
        },
        {
          children: [],
          type: MdBlockType.DIVIDER,
          content: "",
          id: "mdtrail:p216htbpu6e5vnf4w"
        },
        {
          children: [],
          type: MdBlockType.HEADING2,
          content: "h1 1 h2 2 block",
          id: "mdtrail:p216htbpu6e5vnf4wvt9"
        }
      ],
      type: MdBlockType.HEADING1,
      content: "h1 1",
      id: "mdtrail:why60qlg3u5egi771fm3"
    },
    {
      type: MdBlockType.HEADING1,
      children: [],
      content: "h1 2",
      id: "mdtrail:e2xg726y72leszcnp1zd"
    }
  ],
  type: MdBlockType.MARKDOWN,
  content: "some content",
  id: "mdtrail:uy4urnx3z643jnt217ez"
};
export const sampleMdTwo: NodeMarkdown = {
  children: [
    {
      children: [
        {
          content: {
            type: MdBlockType.SIMPLE_TEXT,
            body: "h1 1 text block"
          },
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0"
        },
        {
          children: [
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam"
              },
              id: "mdtrail:2nf1gtuulr0yotuuipfs"
            },
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam"
              },

              id: "mdtrail:0i18cc5p90wdisg5rp4y"
            }
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotuuipfs",
            "mdtrail:0i18cc5p90wdisg5rp4y"
          ],
          content: {
            type: MdBlockType.HEADING2,
            body: "h1 1 h2 1 block"
          },
          id: "mdtrail:g8nzhoct35w996rvqers"
        },
        {
          content: {
            type: MdBlockType.DIVIDER
          },
          id: "mdtrail:p216tbpu6e5"
        },
        {
          children: [
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam"
              },
              id: "mdtrail:2nf1gtuulr0yotufs"
            },
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam"
              },
              id: "mdtrail:0i18cc5p9isg5rp4y"
            }
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotufs",
            "mdtrail:0i18cc5p9isg5rp4y"
          ],
          content: {
            type: MdBlockType.HEADING2,
            body: "h1 1 h2 2 block"
          },
          id: "mdtrail:p216htbpu6e5vnf4wvt9"
        }
      ],
      childrenHierarchy: [
        "mdtrail:g8nzhoct35w996rvqers",
        "mdtrail:p216htbpu6e5vnf4wvt9"
      ],
      content: {
        type: MdBlockType.HEADING1,
        body: "h1 1"
      },
      id: "mdtrail:why60qlg3u5egi771fm3"
    },
    {
      content: {
        type: MdBlockType.DOUBLE_DIVIDER
      },
      id: "mdtrail:p216htbpu6e5"
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING1,
        body: "h1 2"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd"
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING2,
        body: "h2 1"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd2"
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING3,
        body: "h3 1"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd3"
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING4,
        body: "h4 1"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd4"
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING5,
        body: "h5 1"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd5"
    },
    {
      children: [],
      content: {
        type: MdBlockType.SIMPLE_TEXT,
        body: "simple text"
      },
      id: "mdtrail:e2xg726y72leszcnp1zd2t3"
    },
    {
      children: [],
      content: {
        type: MdBlockType.LIST,
        body: {
          type: ListType.UNORDERED,
          content: {
            type: MdBlockType.SIMPLE_TEXT,
            body: "list item 1"
          }
        },
        children: [
          {
            id: "mdtrail:e2xg726addd",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: {
                  type: MdBlockType.SIMPLE_TEXT,
                  body: "sub item 1"
                }
              },
              children: [
                {
                  id: "mdtrail:e2xg72b",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 1"
                    }
                  }
                },
                {
                  id: "mdtrail:e2xg72c",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 2"
                    }
                  }
                },
                {
                  id: "mdtrail:e2xg72d",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 3"
                    }
                  }
                }
              ]
            }
          },
          {
            id: "mdtrail:e2xg726basdas",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: "sub item 2"
              }
            }
          },
          {
            id: "mdtrail:e2xg726cadas",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: "sub item 3"
              }
            }
          }
        ]
      },
      id: "mdtrail:e2xg726y72leszcn"
    },
    {
      children: [],
      content: {
        type: MdBlockType.LIST,
        body: {
          type: ListType.UNORDERED,
          content: "list item 2"
        }
      },
      id: "mdtrail:e2xg726yeszcn"
    }
  ],
  childrenHierarchy: [
    "mdtrail:why60qlg3u5egi771fm3",
    "mdtrail:p216htbpu6e5",
    "mdtrail:e2xg726y72leszcnp1zd"
  ],
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: "some content"
  },
  id: "mdtrail:uy4urnx3z643jnt217ez"
};
export const emptyBlock: Block = {
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: ""
  },
  id: generateUID()
};
export const emptyMd: NodeMarkdown = {
  children: [{ ...emptyBlock, id: generateUID(), children: [] }],
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: ""
  },
  id: generateUID()
};
const seedMdStore: MdStore = {
  md: emptyMd,
  blocks: [],
  context: MdContext.BASIC
};

export const mdContentChangeEvent = initMdContentChangeEvent();

function initMdContentChangeEvent() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    trigger: () => set(!get(mdContentChangeEvent))
  };
}

export const mdStores = new Map();
export type mdStoreType = {
  subscribe: any;
  load: any;
  reset: any;
  insert: any;
  insertStructualBlock: any;
  handleInsertForExistingList: any;
  convert: (
    id: string,
    params: {
      blockType: MdBlockType.LIST | TextType;
      listType?: ListType;
    }
  ) => {};
  deleteBlock: any;
  focusPreviousSibling: any;
  focusBlock: any;
  generateMarkdownText: any;
};
export function getMdStore(id: string): mdStoreType {
  if (!mdStores.has(id)) {
    mdStores.set(id, initMarkdownStore());
  }
  return mdStores.get(id);
}

export const mdStore: mdStoreType = initMarkdownStore();
function initMarkdownStore() {
  const { subscribe, set, update } = writable<MdStore>(seedMdStore);
  return {
    subscribe,
    load(
      md: NodeMarkdown | BasicMarkdown,
      context: MdContext,
      params: MdParams | undefined = undefined
    ) {
      if (md && "blocks" in md) {
        set(
          deepCopy({
            context,
            params,
            blocks: md.blocks,
            blockToFocus: md.blocks[0].id
          })
        );
      } else {
        set({
          md,
          context,
          params,
          blocks: recursivelyExtractAllChildrenIntoArray(md),
          blockToFocus: md.children?.[0]?.id
        });
      }
    },
    reset: () => set(seedMdStore),
    /**
     * Inserts a new block after the context block
     * @param contextBlockId block to insert the new block after
     * @param params block type to insert, defaults to simple text
     */
    insert: (
      contextBlockId: string,
      params: { blockType?: MdBlockType; listType?: ListType } = {
        blockType: MdBlockType.SIMPLE_TEXT,
        listType: ListType.UNORDERED
      }
    ) => {
      update((n) => {
        const contextBlockIndex = n.blocks.findIndex(
          (b) => b.id === contextBlockId
        );
        let newBlock: Block;
        if (
          params.blockType &&
          params.blockType != MdBlockType.LIST &&
          params.blockType != MdBlockType.MARKDOWN
        ) {
          newBlock = {
            id: generateUID(),
            content: {
              type: params.blockType ?? MdBlockType.SIMPLE_TEXT,
              body: ""
            }
          };
        } else if (params.blockType === MdBlockType.LIST) {
          newBlock = {
            id: generateUID(),
            content: {
              type: MdBlockType.LIST,
              body: {
                type: params.listType ?? ListType.UNORDERED,
                content: {
                  type: MdBlockType.SIMPLE_TEXT,
                  body: ""
                }
              }
            }
          };
        } else {
          newBlock = {
            id: generateUID(),
            content: {
              type: MdBlockType.SIMPLE_TEXT,
              body: ""
            }
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
    },
    /**
     * Inserts a structural block after the context block
     * @param contextBlockId block to insert the new block after
     * @param blockType type of structural block to insert
     */
    insertStructualBlock: (
      contextBlockId: string,
      blockType: MdBlockType.DIVIDER | MdBlockType.DOUBLE_DIVIDER
    ) => {
      update((n) => {
        const contextBlockIndex = n.blocks.findIndex(
          (b) => b.id === contextBlockId
        );
        const newBlock: Block = {
          id: generateUID(),
          content: {
            type:
              blockType === MdBlockType.DIVIDER
                ? MdBlockType.DIVIDER
                : MdBlockType.DOUBLE_DIVIDER
          }
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
    },
    /**
     * Handles insert operations for lists which are already present
     * @param contextId the id of the block to insert the new block after
     */
    handleInsertForExistingList: (
      contextId: string,
      parentHierarchy: string[]
    ) => {
      update((n) => {
        if (parentHierarchy.length === 0) {
          const { blocks, id } = handleInsertion(n.blocks);
          n.blocks = blocks;
          n.blockToFocus = id;
          console.log({ blockToFocus: n.blockToFocus });
          return n;
        }
        const topMostParentId = parentHierarchy.shift();
        const topMostParent = n.blocks.find((b) => b.id === topMostParentId);
        console.log({ topMostParent });
        if (
          topMostParent &&
          "children" in topMostParent.content &&
          topMostParent.content.children
        ) {
          let iterParent: Block | ListChild | undefined = topMostParent;
          parentHierarchy.forEach((item) => {
            console.log({ iterParent, item });
            iterParent = getChild(iterParent, item);
          });
          console.log("final iterParent", { iterParent });
          if (
            !iterParent ||
            !("children" in iterParent.content) ||
            !iterParent.content.children
          )
            return n;
          const blocksInScopeForChange = iterParent.content.children;
          const { blocks, id } = handleInsertion(blocksInScopeForChange);
          iterParent.content.children = blocks;
          n.blockToFocus = id;
          console.log({ blockToFocus: n.blockToFocus });
          return n;
        }
        return n;
        /**
         * Iterator function to find the child that matches the childId to ultimately arrive at the deep nesting and insert the new block
         * @param block parent block
         * @param childId the id of the child to find
         * @returns blocks of the child that matches the childId
         */
        function getChild(
          block: ListChild | Block | undefined,
          childId: string
        ) {
          if (
            block &&
            "children" in block.content &&
            block.content.children &&
            block.content.children.length > 0
          )
            return block.content.children.find((b) => b.id === childId);
        }
        /**
         * Handles the insertion of a new block in the context of a list
         * @param blocks the blocks to insert into
         * @returns the new blocks and the id of the new block
         */
        function handleInsertion(blocks: Block[] | ListChild[]) {
          const contextBlockIndex = blocks.findIndex((b) => b.id === contextId);
          const currentBlock = blocks[contextBlockIndex];
          let newBlock: Block = {
            id: generateUID(),
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: {
                  type: MdBlockType.SIMPLE_TEXT,
                  body: ""
                }
              },
              children: []
            }
          };
          if (
            "children" in currentBlock.content &&
            "children" in newBlock.content &&
            isValidArrayWithData(currentBlock.content.children)
          ) {
            const currentListItemChildren = currentBlock.content.children;
            newBlock.content.children = currentListItemChildren;
            currentBlock.content.children = [];
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
    },
    convert: (
      id: string,
      params: {
        blockType: MdBlockType.LIST | TextType;
        listType?: ListType;
      } = {
        blockType: MdBlockType.SIMPLE_TEXT,
        listType: ListType.UNORDERED
      }
    ) => {
      update((n) => {
        const block = n.blocks.find((b) => b.id === id);
        if (block && "body" in block.content) {
          block.content.type = params.blockType;
          if (params.blockType === MdBlockType.LIST) {
            block.content.body = {
              type: ListType.UNORDERED,
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: ""
              }
            };
          } else {
            block.content.body = "";
          }
        }
        console.log({ block });
        n.blockToFocus = id;
        return n;
      });
    },
    deleteBlock: (id: string) => {
      update((n) => {
        const deleteIndex = n.blocks.findIndex((b) => b.id === id);
        n.blocks = n.blocks.filter((b) => b.id !== id);
        n.blockToFocus = n.blocks[deleteIndex - 1].id;
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
    }
    //Not required for simple markdown editor - can save blocks instead of nested md
    // fetchAsNestedMd: () => {
    //   const n = get(mdStore);
    //   return parseBlocksIntoNestedMd(n);
    // },
  };
}

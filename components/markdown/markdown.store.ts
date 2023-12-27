import {
  MdBlockType,
  type MdStore,
  SpanType,
  type NodeMarkdown,
  type Block,
  MdContext,
  type MdParams,
  ListType,
  type Markdown,
} from "$lib/tidy/types/md.type";
import { deepCopy } from "$lib/tidy/utils/obj.utils";
import { generateMarkdownText } from "$lib/tidy/utils/text.utils";
import { generateUID } from "$lib/tidy/utils/utils";
import { get, writable } from "svelte/store";

export const sampleMd = {
  children: [
    {
      children: [
        {
          children: [],
          type: MdBlockType.SIMPLE_TEXT,
          content: "h1 1 text block",
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0",
        },
        {
          children: [
            {
              children: [],
              type: MdBlockType.SIMPLE_TEXT,
              content:
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              id: "mdtrail:2nf1gtuulr0yotuuipfs",
            },
            {
              children: [],
              type: MdBlockType.SIMPLE_TEXT,
              content: [
                {
                  type: SpanType.BOLD,
                  content:
                    "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
                  id: "mdtrail:2nf1gtuulr0yotuu ",
                },
                {
                  type: SpanType.ITALIC,
                  content:
                    "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu",
                  id: "mdtrail:2nf1gtuulr0yotuuipf ",
                },
                {
                  type: SpanType.UNDERLINE,
                  content: [
                    {
                      type: SpanType.DEFAULT,
                      content:
                        "fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est",
                      id: "mdtrail:2nf1gtuulr0yo",
                    },
                    {
                      type: SpanType.BOLD,
                      content: "reference",
                      id: "mdtrail:2nf1gtuulr0yot",
                    },
                    {
                      type: SpanType.CODE,
                      content: "code",
                      id: "mdtrail:2nf1gtuulr0yotu",
                    },
                    {
                      type: SpanType.DEFAULT,
                      content: "laborum.",
                      id: "mdtrail:2nf1gtuulr0yotuui",
                    },
                  ],
                  id: "mdtrail:2nf1gtuulr0yotuui",
                },
              ],
              id: "mdtrail:0i18cc5p90wdisg5rp4y",
            },
          ],
          type: MdBlockType.HEADING2,
          content: "h1 1 h2 1 block",
          id: "mdtrail:g8nzhoct35w996rvqers",
        },
        {
          children: [],
          type: MdBlockType.DIVIDER,
          content: "",
          id: "mdtrail:p216htbpu6e5vnf4w",
        },
        {
          children: [],
          type: MdBlockType.HEADING2,
          content: "h1 1 h2 2 block",
          id: "mdtrail:p216htbpu6e5vnf4wvt9",
        },
      ],
      type: MdBlockType.HEADING1,
      content: "h1 1",
      id: "mdtrail:why60qlg3u5egi771fm3",
    },
    {
      type: MdBlockType.HEADING1,
      children: [],
      content: "h1 2",
      id: "mdtrail:e2xg726y72leszcnp1zd",
    },
  ],
  type: MdBlockType.MARKDOWN,
  content: "some content",
  id: "mdtrail:uy4urnx3z643jnt217ez",
};
export const sampleMdTwo: NodeMarkdown = {
  children: [
    {
      children: [
        {
          content: {
            type: MdBlockType.SIMPLE_TEXT,
            body: "h1 1 text block",
          },
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0",
        },
        {
          children: [
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              },
              id: "mdtrail:2nf1gtuulr0yotuuipfs",
            },
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              },

              id: "mdtrail:0i18cc5p90wdisg5rp4y",
            },
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotuuipfs",
            "mdtrail:0i18cc5p90wdisg5rp4y",
          ],
          content: {
            type: MdBlockType.HEADING2,
            body: "h1 1 h2 1 block",
          },
          id: "mdtrail:g8nzhoct35w996rvqers",
        },
        {
          content: {
            type: MdBlockType.DIVIDER,
          },
          id: "mdtrail:p216tbpu6e5",
        },
        {
          children: [
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              },
              id: "mdtrail:2nf1gtuulr0yotufs",
            },
            {
              content: {
                type: MdBlockType.SIMPLE_TEXT,
                body: "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              },
              id: "mdtrail:0i18cc5p9isg5rp4y",
            },
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotufs",
            "mdtrail:0i18cc5p9isg5rp4y",
          ],
          content: {
            type: MdBlockType.HEADING2,
            body: "h1 1 h2 2 block",
          },
          id: "mdtrail:p216htbpu6e5vnf4wvt9",
        },
      ],
      childrenHierarchy: [
        "mdtrail:g8nzhoct35w996rvqers",
        "mdtrail:p216htbpu6e5vnf4wvt9",
      ],
      content: {
        type: MdBlockType.HEADING1,
        body: "h1 1",
      },
      id: "mdtrail:why60qlg3u5egi771fm3",
    },
    {
      content: {
        type: MdBlockType.DOUBLE_DIVIDER,
      },
      id: "mdtrail:p216htbpu6e5",
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING1,
        body: "h1 2",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd",
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING2,
        body: "h2 1",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd2",
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING3,
        body: "h3 1",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd3",
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING4,
        body: "h4 1",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd4",
    },
    {
      children: [],
      content: {
        type: MdBlockType.HEADING5,
        body: "h5 1",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd5",
    },
    {
      children: [],
      content: {
        type: MdBlockType.SIMPLE_TEXT,
        body: "simple text",
      },
      id: "mdtrail:e2xg726y72leszcnp1zd2t3",
    },
    {
      children: [],
      content: {
        type: MdBlockType.LIST,
        body: {
          type: ListType.UNORDERED,
          content: {
            type: MdBlockType.SIMPLE_TEXT,
            body: "list item 1",
          },
        },
        children: [
          {
            order: 1,
            id: "mdtrail:e2xg726addd",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: {
                  type: MdBlockType.SIMPLE_TEXT,
                  body: "sub item 1",
                },
              },
              children: [
                {
                  order: 1,
                  id: "mdtrail:e2xg72b",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 1",
                    },
                  },
                },
                {
                  order: 2,
                  id: "mdtrail:e2xg72c",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 2",
                    },
                  },
                },
                {
                  order: 3,
                  id: "mdtrail:e2xg72d",
                  content: {
                    type: MdBlockType.LIST,
                    body: {
                      type: ListType.UNORDERED,
                      content: "sub sub item 3",
                    },
                  },
                },
              ],
            },
          },
          {
            order: 2,
            id: "mdtrail:e2xg726basdas",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: "sub item 2",
              },
            },
          },
          {
            order: 3,
            id: "mdtrail:e2xg726cadas",
            content: {
              type: MdBlockType.LIST,
              body: {
                type: ListType.UNORDERED,
                content: "sub item 3",
              },
            },
          },
        ],
      },
      id: "mdtrail:e2xg726y72leszcn",
    },
    {
      children: [],
      content: {
        type: MdBlockType.LIST,
        body: {
          type: ListType.UNORDERED,
          content: "list item 2",
        },
      },
      id: "mdtrail:e2xg726yeszcn",
    },
  ],
  childrenHierarchy: [
    "mdtrail:why60qlg3u5egi771fm3",
    "mdtrail:p216htbpu6e5",
    "mdtrail:e2xg726y72leszcnp1zd",
  ],
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: "some content",
  },
  id: "mdtrail:uy4urnx3z643jnt217ez",
};
let emptyBlock: Block = {
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: "",
  },
  id: generateUID(),
};
export const emptyMd: NodeMarkdown = {
  children: [{ ...emptyBlock, id: generateUID(), children: [] }],
  content: {
    type: MdBlockType.SIMPLE_TEXT,
    body: "",
  },
  id: generateUID(),
};
const seedMdStore: MdStore = {
  md: emptyMd,
  blocks: [],
  context: MdContext.BASIC,
};

export const mdContentChangeEvent = initMdContentChangeEvent();

function initMdContentChangeEvent() {
  const { subscribe, set, update } = writable<boolean>(false);
  return {
    subscribe,
    trigger: () => set(!get(mdContentChangeEvent)),
  };
}

export const mdStore = initMarkdownStore();
function initMarkdownStore() {
  const { subscribe, set, update } = writable<MdStore>(seedMdStore);
  return {
    subscribe,
    load(
      md: NodeMarkdown | Markdown,
      context: MdContext,
      params: MdParams | undefined = undefined
    ) {
      if (md && "blocks" in md) {
        set(
          deepCopy({
            context,
            params,
            blocks: md.blocks,
            focusedBlockId: md.blocks[0].id,
          })
        );
      } else {
        set({
          md,
          context,
          params,
          blocks: recursivelyExtractAllChildrenIntoArray(md),
          focusedBlockId: md.children?.[0]?.id,
        });
      }
    },
    reset: () => set(seedMdStore),
    insert: (
      contextBlockId: string,
      params: { blockType?: MdBlockType } = {
        blockType: MdBlockType.SIMPLE_TEXT,
      }
    ) => {
      update((n) => {
        const contextBlockIndex = n.blocks.findIndex(
          (b) => b.id === contextBlockId
        );
        const isStructuralBlock =
          params.blockType === MdBlockType.DIVIDER ||
          params.blockType === MdBlockType.DOUBLE_DIVIDER;
        let newBlock: Block;
        if (isStructuralBlock) {
          newBlock = {
            id: generateUID(),
            content: {
              type:
                params.blockType === MdBlockType.DIVIDER
                  ? MdBlockType.DIVIDER
                  : MdBlockType.DOUBLE_DIVIDER,
            },
          };
        } else if (
          params.blockType &&
          params.blockType != MdBlockType.LIST &&
          params.blockType != MdBlockType.MARKDOWN
        ) {
          newBlock = {
            id: generateUID(),
            content: {
              type: params.blockType ?? MdBlockType.SIMPLE_TEXT,
              body: "",
            },
          };
        } else {
          newBlock = {
            id: generateUID(),
            content: {
              type: MdBlockType.SIMPLE_TEXT,
              body: "",
            },
          };
        }
        n.blocks = [
          ...n.blocks.slice(
            0,
            isStructuralBlock ? contextBlockIndex : contextBlockIndex + 1
          ),
          newBlock,
          ...n.blocks.slice(
            isStructuralBlock ? contextBlockIndex : contextBlockIndex + 1
          ),
        ];
        n.focusedBlockId = newBlock.id;
        if (n.context === MdContext.NODE) {
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
              ),
            ];
          }
        }
        // console.log(n);
        return n;
      });
    },
    deleteBlock: (id: string) => {
      update((n) => {
        const deleteIndex = n.blocks.findIndex((b) => b.id === id);
        n.blocks = n.blocks.filter((b) => b.id !== id);
        n.focusedBlockId = n.blocks[deleteIndex - 1].id;
        return n;
      });
    },
    focusPreviousSibling: (id: string) => {
      update((n) => {
        const contextIndex = n.blocks.findIndex((b) => b.id === id);
        n.focusedBlockId = n.blocks[contextIndex - 1].id;
        return n;
      });
    },
    focusBlock: (id: string) => {
      update((n) => {
        n.focusedBlockId = id;
        return n;
      });
    },
    generateMarkdownText: () => {
      const n = get(mdStore);
      const blocks: Block[] = deepCopy(n.blocks);
      return generateMarkdownText(blocks);
    },
    //Not required for simple markdown editor - can save blocks instead of nested md
    // fetchAsNestedMd: () => {
    //   const n = get(mdStore);
    //   return parseBlocksIntoNestedMd(n);
    // },
  };
}

function recursivelyExtractAllChildrenIntoArray(md: NodeMarkdown) {
  let children: Block[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push({
        content: child.content,
        id: child.id,
        childrenHierarchy: child.childrenHierarchy,
      });
      children.push(...recursivelyExtractAllChildrenIntoArray(child));
    });
  }
  return children;
}

function parseBlocksIntoNestedMd(mdStore: MdStore) {
  const md = deepCopy(mdStore.md);
  md.children = recursivelyFormParentFromChildren(
    mdStore.blocks,
    md.childrenHierarchy
  );
  return md;
}

function recursivelyFormParentFromChildren(
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
          ),
        };
        children.push(newChild);
      }
    });
  }
  return children;
}

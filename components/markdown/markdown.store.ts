import {
  BlockType,
  type MdStore,
  SpanType,
  type Markdown,
  type Block,
  MdContext,
  type MdParams,
} from "$lib/tidy/types/md.type";
import { deepCopy } from "$lib/tidy/utils/obj.utils";
import { generateUID } from "$lib/tidy/utils/utils";
import { get, writable } from "svelte/store";

export const sampleMd = {
  children: [
    {
      children: [
        {
          children: [],
          type: BlockType.TEXT,
          content: "h1 1 text block",
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0",
        },
        {
          children: [
            {
              children: [],
              type: BlockType.TEXT,
              content:
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              id: "mdtrail:2nf1gtuulr0yotuuipfs",
            },
            {
              children: [],
              type: BlockType.TEXT,
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
          type: BlockType.HEADING2,
          content: "h1 1 h2 1 block",
          id: "mdtrail:g8nzhoct35w996rvqers",
        },
        {
          children: [],
          type: BlockType.DIVIDER,
          content: "",
          id: "mdtrail:p216htbpu6e5vnf4w",
        },
        {
          children: [],
          type: BlockType.HEADING2,
          content: "h1 1 h2 2 block",
          id: "mdtrail:p216htbpu6e5vnf4wvt9",
        },
      ],
      type: BlockType.HEADING1,
      content: "h1 1",
      id: "mdtrail:why60qlg3u5egi771fm3",
    },
    {
      type: BlockType.HEADING1,
      children: [],
      content: "h1 2",
      id: "mdtrail:e2xg726y72leszcnp1zd",
    },
  ],
  type: BlockType.MARKDOWN,
  content: "some content",
  id: "mdtrail:uy4urnx3z643jnt217ez",
};
export const sampleMdTwo: Markdown = {
  children: [
    {
      children: [
        {
          type: BlockType.TEXT,
          content: "h1 1 text block",
          id: "mdtrail:djhmtyd3rc0jwg7pr3r0",
        },
        {
          children: [
            {
              type: BlockType.TEXT,
              content:
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ",
              id: "mdtrail:2nf1gtuulr0yotuuipfs",
            },
            {
              type: BlockType.TEXT,
              content:
                "lo*r*em ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut **enim ad _minim_ veniam** something is not -> right or this way <- but it can be any way you want it to be <->",
              id: "mdtrail:0i18cc5p90wdisg5rp4y",
            },
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotuuipfs",
            "mdtrail:0i18cc5p90wdisg5rp4y",
          ],
          type: BlockType.HEADING2,
          content: "Heading 2 first",
          id: "mdtrail:g8nzhoct35w996rvqers",
        },
        {
          children: [
            {
              type: BlockType.TEXT,
              content:
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ",
              id: "mdtrail:2nf1gtuulr0yotufs",
            },
            {
              type: BlockType.TEXT,
              content:
                "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam",
              id: "mdtrail:0i18cc5p9isg5rp4y",
            },
          ],
          childrenHierarchy: [
            "mdtrail:2nf1gtuulr0yotufs",
            "mdtrail:0i18cc5p9isg5rp4y",
          ],
          type: BlockType.HEADING2,
          content: "Heading 2 second",
          id: "mdtrail:p216htbpu6e5vnf4wvt9",
        },
      ],
      childrenHierarchy: [
        "mdtrail:g8nzhoct35w996rvqers",
        "mdtrail:p216htbpu6e5vnf4wvt9",
      ],
      type: BlockType.HEADING1,
      content: "Heading 1 first",
      id: "mdtrail:why60qlg3u5egi771fm3",
    },
    {
      type: BlockType.DIVIDER,
      content: "",
      id: "mdtrail:p216htbpu6e5",
    },
    {
      type: BlockType.HEADING1,
      children: [],
      content: "Heading 1 second",
      id: "mdtrail:e2xg726y72leszcnp1zd",
    },
  ],
  childrenHierarchy: [
    "mdtrail:why60qlg3u5egi771fm3",
    "mdtrail:p216htbpu6e5",
    "mdtrail:e2xg726y72leszcnp1zd",
  ],
  type: BlockType.MARKDOWN,
  content: "some content",
  id: "mdtrail:uy4urnx3z643jnt217ez",
};
let emptyBlock: Block = {
  type: BlockType.TEXT,
  content: "",
  id: generateUID(),
};
let emptyMd: Markdown = {
  children: [{ ...emptyBlock, id: generateUID(), children: [] }],
  type: BlockType.MARKDOWN,
  content: "",
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
      md: Markdown,
      context: MdContext,
      params: MdParams | undefined = undefined
    ) {
      set({
        md,
        context,
        params,
        blocks: recursivelyExtractAllChildrenIntoArray(md),
        focusedBlockId: md.children?.[0]?.id,
      });
    },
    reset: () => set(seedMdStore),
    insert: (previousSiblingId: string) => {
      update((n) => {
        const previousSiblingIndex = n.blocks.findIndex(
          (b) => b.id === previousSiblingId
        );
        const newBlock = { ...emptyBlock, id: generateUID() };
        n.blocks = [
          ...n.blocks.slice(0, previousSiblingIndex + 1),
          newBlock,
          ...n.blocks.slice(previousSiblingIndex + 1),
        ];
        n.focusedBlockId = newBlock.id;
        if (n.context === MdContext.NODE) {
          const parent = n.blocks.find((b) =>
            b.childrenHierarchy?.includes(previousSiblingId)
          );
          if (parent && parent.childrenHierarchy) {
            const previousSiblingIndexInParentContext =
              parent.childrenHierarchy.findIndex(
                (c) => c === previousSiblingId
              );
            parent.childrenHierarchy = [
              ...parent.childrenHierarchy.slice(
                0,
                previousSiblingIndexInParentContext + 1
              ),
              newBlock.id,
              ...parent.childrenHierarchy.slice(
                previousSiblingIndexInParentContext + 1
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
    focusBlock: (id: string) => {
      update((n) => {
        n.focusedBlockId = id;
        return n;
      });
    },
    //Not required for simple markdown editor - can save blocks instead of nested md
    // fetchAsNestedMd: () => {
    //   const n = get(mdStore);
    //   return parseBlocksIntoNestedMd(n);
    // },
  };
}

function recursivelyExtractAllChildrenIntoArray(md: Markdown) {
  let children: Block[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push({
        type: child.type,
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
  let children: Markdown[] = [];
  if (childrenHierarchy && childrenHierarchy.length > 0) {
    childrenHierarchy.forEach((childId) => {
      const child = blocks.find((b) => b.id === childId);
      if (child) {
        const newChild: Markdown = {
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

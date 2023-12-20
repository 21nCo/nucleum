import {
  BlockType,
  type MdStore,
  SpanType,
  type Markdown,
  type Block,
} from "$lib/tidy/types/md.type";
import { deepCopy } from "$lib/tidy/utils/obj.utils";
import { generateUID } from "$lib/tidy/utils/utils";
import { writable } from "svelte/store";

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
                "lorem ipsum dolor **sit amet, *consectetur adipiscing elit*, sed do `eiusmod ~~tempor~~` incididunt** ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ",
              id: "mdtrail:2nf1gtuulr0yotuuipfs",
            },
            {
              children: [],
              type: BlockType.TEXT,
              content:
                "lo*r*em ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut **enim ad _minim_ veniam** something is not -> right or this way <- but it can be any way you want it to be <->",
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
let emptyBlock = {
  type: BlockType.TEXT,
  content: "",
  children: [],
};
let emptyMd: Markdown = {
  children: [{ ...emptyBlock, id: generateUID() }],
  type: BlockType.MARKDOWN,
  content: "",
  id: generateUID(),
};
const seedMdStore: MdStore = {
  md: emptyMd,
  blocks: [],
};

export const mdStore = initMarkdownStore();
function initMarkdownStore() {
  const { subscribe, set, update } = writable<MdStore>(seedMdStore);
  return {
    subscribe,
    load(md: Markdown) {
      set({
        md,
        blocks: recursivelyExtractAllChildrenIntoArray(md),
        focusedBlockId: md.children[0].id,
      });
    },
    reset: () => set(seedMdStore),
    insert: (id: string) => {
      update((n) => {
        const insertIndex = n.blocks.findIndex((b) => b.id === id);
        const newBlock = { ...emptyBlock, id: generateUID() };
        n.blocks = [
          ...n.blocks.slice(0, insertIndex + 1),
          newBlock,
          ...n.blocks.slice(insertIndex + 1),
        ];
        n.focusedBlockId = newBlock.id;
        console.log(n);
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
  };
}

function recursivelyExtractAllChildrenIntoArray(md: Markdown) {
  let children: Block[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push(child);
      children.push(...recursivelyExtractAllChildrenIntoArray(child));
    });
  }
  return children;
}

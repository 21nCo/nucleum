<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { InlineType } from "$lib/client/types/memotron/md.type";
  import { NodeType, ListType } from "$lib/client/types/memotron/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import {
    compareObjects,
    isValidArrayWithData
  } from "$lib/client/utils/obj.utils";
  import { properCase } from "$lib/client/utils/text.utils";
  import BlockItem from "./BlockItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let variant: "v1" | "v2" = "v2";
  let selectedSection = "";
  let focusedItem: any;
  let config = [
    {
      section: "headings",
      children: [
        {
          label: "Heading 1",
          description: "Heading 1 block",
          type: NodeType.HEADING1,
          icon: "heading1"
        },
        {
          label: "Heading 2",
          description: "Heading 2 block",
          type: NodeType.HEADING2,
          icon: "heading2"
        },
        {
          label: "Heading 3",
          description: "Heading 3 block",
          type: NodeType.HEADING3,
          icon: "heading3"
        },
        {
          label: "Heading 4",
          description: "Heading 4 block",
          type: NodeType.HEADING4,
          icon: "heading4"
        },
        {
          label: "Heading 5",
          description: "Heading 5 block",
          type: NodeType.HEADING5,
          icon: "heading5"
        }
      ]
    },
    {
      section: "text",
      children: [
        {
          label: "Paragraph",
          description: "Paragraph block",
          type: NodeType.SIMPLE_TEXT,
          icon: "text"
        },
        {
          label: "Quote",
          description: "Quote block",
          type: NodeType.QUOTE,
          icon: "quote"
        },
        {
          label: "Code",
          description: "Code block",
          type: NodeType.CODE,
          icon: "code"
        },
        {
          label: "Math",
          description: "Math block",
          type: NodeType.MATH,
          icon: "math"
        },
        {
          label: "Callout",
          description: "Callout block",
          type: NodeType.CALLOUT,
          icon: "bookmark"
        },
        {
          label: "Link",
          description: "Link block",
          type: NodeType.LINK,
          icon: "link"
        }
      ]
    },
    {
      section: "inline",
      children: [
        {
          label: "Mention",
          description: "Mention a node or a collection",
          type: InlineType.MENTION,
          icon: "at-symbol"
        },
        {
          label: "Date",
          description: "Mention a date",
          type: InlineType.DATE,
          icon: "calendar-days"
        },
        {
          label: "Inline code",
          description: "Write inline code",
          type: InlineType.CODE,
          icon: "code"
        }
      ]
    },
    {
      section: "lists",
      children: [
        {
          label: "Unordered List",
          description: "Unordered List block",
          type: NodeType.LIST,
          sub: ListType.UNORDERED,
          icon: "unordered-list"
        },
        {
          label: "Ordered List",
          description: "Ordered List block",
          type: NodeType.LIST,
          sub: ListType.ORDERED,
          icon: "ordered-list"
        },
        {
          label: "Checklist",
          description: "Checklist block",
          type: NodeType.LIST,
          sub: ListType.CHECKLIST,
          icon: "checklist"
        }
      ]
    },
    {
      section: "structure",
      children: [
        {
          label: "Divider",
          description: "Divider block",
          type: NodeType.DIVIDER,
          icon: "divider"
        },
        {
          label: "Double Divider",
          description: "Divider block",
          type: NodeType.DOUBLE_DIVIDER,
          icon: "divider"
        },
        {
          label: "Table",
          description: "Table block",
          type: NodeType.TABLE,
          icon: "table"
        },
        {
          label: "Grid",
          description: "Grid block",
          type: NodeType.GRID,
          icon: "squares-2x2"
        },
        {
          label: "Accordion",
          description: "Accordion block",
          type: NodeType.ACCORDION,
          icon: "queue-list"
        },
        {
          label: "Tabs",
          description: "Tabs block",
          type: NodeType.TABS,
          icon: "tabs"
        },
        {
          label: "Media stack",
          description: "Media stack block",
          type: NodeType.MEDIA_STACK,
          icon: "rectangle-stack"
        },
        {
          label: "Media grid",
          description: "Media grid block",
          type: NodeType.MEDIA_GRID,
          icon: "rectangle-group"
        }
      ]
    },
    {
      section: "media",
      children: [
        {
          label: "Image",
          description: "Image block",
          type: NodeType.IMAGE,
          icon: "image"
        },
        {
          label: "Video",
          description: "Video block",
          type: NodeType.VIDEO,
          icon: "video-camera"
        },
        {
          label: "Audio",
          description: "Audio block",
          type: NodeType.AUDIO,
          icon: "music"
        },
        {
          label: "PDF",
          description: "Pdf block",
          type: NodeType.PDF,
          icon: "document"
        },
        {
          label: "File",
          description: "File block",
          type: NodeType.FILE,
          icon: "attachment"
        }
      ]
    },
    {
      section: "advanced",
      children: [
        {
          label: "Table of contents",
          description: "Embed table of contents block",
          type: NodeType.TOC,
          icon: "list"
        },
        {
          label: "Embed",
          description: "Embed block",
          type: NodeType.EMBED,
          icon: "code"
        },
        {
          label: "Embed collection",
          description: "Embed Collection block",
          type: NodeType.COLLECTION_AS_EMBED,
          icon: "collection"
        }
      ]
    }
  ];
  let filteredResults: any[] = config.map((section) => {
    return {
      section: section.section,
      children: section.children.map((c) => {
        return {
          ...c,
          section: section.section
        };
      })
    };
  });
  selectedSection = filteredResults[0].section;
  focusedItem = filteredResults[0].children[0];
  let searchQueryString = "";

  function mapSectionNameToBlock(c: any, sectionName: string) {
    return {
      ...c,
      section: sectionName
    };
  }
  function allFilteredBlocks() {
    return filteredResults
      .map((section) =>
        section.children.map((c: any) =>
          mapSectionNameToBlock(c, section.section)
        )
      )
      .flat();
  }
  export function key(key: "ArrowUp" | "ArrowDown" | "Enter") {
    // console.log({ key });
    let blocks = allFilteredBlocks();
    let index = blocks.indexOf(
      blocks.find((k: any) => compareObjects(k, focusedItem))
    );
    // console.log({ blocks, index });
    if (key === "ArrowUp") {
      if (index > 0) {
        focusedItem = blocks[index - 1];
      }
    } else if (key === "ArrowDown") {
      if (index < blocks.length - 1) {
        focusedItem = blocks[index + 1];
      }
    } else if (key === "Enter") {
      console.log("enter");
      dispatch("select", focusedItem);
    }
    if (selectedSection != focusedItem.section) {
      selectedSection = focusedItem.section;
    }
  }
  export function filter(query: string) {
    const newQueryString = query.split("/")[1];
    if (searchQueryString === newQueryString) {
      return;
    }
    searchQueryString = newQueryString;
    filteredResults = config.map((section) => {
      return {
        section: section.section,
        children: section.children
          .map((c) => mapSectionNameToBlock(c, section.section))
          .filter((block) => {
            return block.label
              .toLowerCase()
              .includes(searchQueryString.toLowerCase());
          })
      };
    });
    filteredResults = filteredResults.filter((section) => {
      return section.children.length > 0;
    });
    if (filteredResults.length > 0) {
      focusedItem = filteredResults[0].children[0];
    } else {
    }
  }
</script>

<div
  class="blockbrowser bg-bgs1 border border-brs2 backdrop-blur h-[45vh] rounded-md flex flex-col gap-12 overflow-auto styledscroll {searchQueryString
    ? 'w-72'
    : 'w-[30rem]'} {variant === 'v1' || searchQueryString ? 'p-4 pb-10' : ''}"
>
  {#if variant === "v1" || searchQueryString}
    {#if isValidArrayWithData(filteredResults)}
      {#each filteredResults as section}
        <div class="flex flex-col items-start gap-4">
          <Text content={section.section} style={TextStyle.SECTION_HEADING} />
          <div class="flex flex-wrap gap-2 w-full">
            {#each section.children as block}
              <BlockItem
                {block}
                on:select
                isFocused={compareObjects(focusedItem, block)}
                width={searchQueryString ? "w-full min-w-full" : "w-52"}
              />
            {/each}
          </div>
        </div>
      {/each}
    {:else}
      <EmptyStatusView
        size={Size.sm}
        subText="No blocks found. Please try another search query"
      />
    {/if}
  {:else}
    <div class="flex h-full w-full">
      <aside
        class="flex flex-col items-start gap-2 bg-bgs2 h-full px-2 py-4 grow"
      >
        <Text content="Block type" style={TextStyle.SECTION_HEADING_SMALL} />
        <div class="flex flex-col gap-1 w-full overflow-auto">
          {#each filteredResults as section}
            <button
              class="flex items-center gap-3 hover:bg-bgs3 py-2 px-2 rounded-md text-h5 {selectedSection ===
              section.section
                ? 'bg-bgs3 font-medium'
                : 'font-light'}"
              on:click={() => (selectedSection = section.section)}
            >
              <div>{properCase(section.section)}</div>
            </button>
          {/each}
        </div>
      </aside>
      <div
        class="flex flex-col gap-2 py-4 px-2 w-72 overflow-auto styledscroll pb-20"
      >
        {#each filteredResults as section}
          {#if section.section === selectedSection}
            {#each section.children as block}
              <BlockItem
                {block}
                on:select
                isFocused={compareObjects(focusedItem, block)}
              />
            {/each}
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .blockbrowser {
    box-shadow: 0px 0px 6px 0px rgba(var(--colors-bgs3), 1);
  }
</style>

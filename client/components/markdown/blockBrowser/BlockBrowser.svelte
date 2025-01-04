<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { InlineType } from "$lib/client/components/markdown/md.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import BlockItem from "./BlockItem.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import type { IBlockBrowserSection } from "./blockBrowser.type";
  const dispatch = createEventDispatcher();
  const nodeContext = getContext<any>("node");

  export let variant: "v1" | "v2" = "v2";
  export let isSingleColumnMode: boolean = false;
  export let onSelect: (e: any) => void = () => {};

  let selectedSection = "";
  let focusedItem: any;

  let embedSection: IBlockBrowserSection = {
    section: "embed",
    children: [
      {
        label: "Embed anything",
        description: "Embed block",
        type: NodeType.EMBED,
        icon: "ph:code-light"
      },
      // {
      //   label: "Embed node",
      //   description: "Embed node block",
      //   type: NodeType.NODE_AS_EMBED,
      //   icon: "ph:circle-light",
      //   isDisabled: true
      // },
      {
        label: "Embed collection",
        description: "Embed Collection block",
        type: NodeType.COLLECTION_AS_EMBED,
        icon: "ph:brackets-round-light"
      },
      {
        label: "Web text clip",
        description: "Embed web text clip",
        type: NodeType.TEXT_CLIP,
        icon: "ph:highlighter-circle-light"
      },
      {
        label: "Youtube video",
        description: "Embed youtube video block",
        type: NodeType.YOUTUBE_VIDEO,
        icon: "ph:youtube-logo-light"
      },
      {
        label: "Tweet",
        description: "Embed tweet block",
        type: NodeType.TWEET,
        icon: "ph:x-logo-light"
      },
      {
        label: "Kindle book",
        description: "Embed kindle book block",
        type: NodeType.KINDLE_BOOK,
        icon: "ph:amazon-logo-light"
      },
      {
        label: "Kindle highlight",
        description: "Embed kindle highlight block",
        type: NodeType.KINDLE_HIGHLIGHT,
        icon: "ph:bookmark-simple-light"
      },
      {
        label: "Graph",
        description: "Embed node graph",
        type: NodeType.GRAPH_AS_EMBED,
        icon: "ph:graph-light",
        isDisabled: true,
        badge: "planned"
      },
      {
        label: "Node links tree",
        description: "Embed node links tree",
        type: NodeType.TREE_OF_LINKS,
        icon: "ph:tree-view-light",
        isDisabled: true,
        badge: "planned"
      },
      {
        label: "Calendar",
        description: "Embed calendar",
        type: NodeType.CALENDAR_AS_EMBED,
        icon: "ph:calendar-light",
        isDisabled: true,
        badge: "planned"
      },
      {
        label: "Table of contents",
        description: "Embed table of contents block",
        type: NodeType.TOC,
        icon: "ph:list-bullets-light",
        isDisabled: true,
        badge: "planned"
      }
    ]
  };

  let layoutSection: IBlockBrowserSection = {
    section: "layout",
    children: [
      {
        label: "Divider",
        description: "Divider block",
        type: NodeType.DIVIDER,
        icon: "hugeicons:solid-line-01",
        isShowShortcut: true
      },
      {
        label: "Double Divider",
        description: "Divider block",
        type: NodeType.DOUBLE_DIVIDER,
        icon: "hugeicons:equal-sign",
        isShowShortcut: true
      },
      {
        label: "Media grid",
        description: "Media grid block",
        type: NodeType.MEDIA_GRID,
        icon: "rectangle-group"
      },
      {
        label: "Cards",
        description: "Cards block",
        type: NodeType.CARDS,
        icon: "ph:squares-four-light",
        badge: "planned",
        isDisabled: true
      },
      {
        label: "Tabs",
        description: "Tabs block",
        type: NodeType.TABS,
        icon: "ph:tabs-light",
        badge: "planned",
        isDisabled: true
      },
      {
        label: "Accordion",
        description: "Accordion block",
        type: NodeType.ACCORDION,
        icon: "queue-list",
        badge: "planned",
        isDisabled: true
      },
      {
        label: "Table",
        description: "Table block",
        type: NodeType.TABLE,
        icon: "ph:table-light",
        badge: "planned",
        isDisabled: true
      },
      {
        label: "Stack",
        description: "Stack block",
        type: NodeType.STACK,
        icon: "ph:stack-light",
        badge: "planned",
        isDisabled: true
      }
    ]
  };
  let mediaSection: IBlockBrowserSection = {
    section: "media",
    children: [
      {
        label: "Image",
        description: "Image block",
        type: NodeType.IMAGE,
        icon: "ph:image-light"
      },
      {
        label: "Audio",
        description: "Audio block",
        type: NodeType.AUDIO,
        icon: "ph:music-note-light"
      },
      {
        label: "Video",
        description: "Video block",
        type: NodeType.VIDEO,
        icon: "ph:video-light"
      },
      {
        label: "PDF",
        description: "Pdf block",
        type: NodeType.PDF,
        icon: "ph:file-pdf-light"
      },
      {
        label: "File",
        description: "File block",
        type: NodeType.FILE,
        icon: "ph:file-light"
      },
      {
        label: "Sketch",
        description: "Sketch block",
        type: NodeType.SKETCH,
        icon: "ri:sketching",
        badge: "planned",
        isDisabled: true
      }
    ]
  };

  let listsSection: IBlockBrowserSection = {
    section: "lists",
    children: [
      {
        label: "Unordered List",
        description: "Unordered List block",
        type: NodeType.LIST,
        // icon: "lucide:list"
        icon: "ph:list-bullets-light",
        isShowShortcut: true
      },
      {
        label: "Ordered List",
        description: "Ordered List block",
        type: NodeType.ORDERED_LIST,
        // icon: "lucide:list-ordered"
        icon: "ph:list-numbers-light",
        isShowShortcut: true
      },
      {
        label: "Checklist",
        description: "Checklist block",
        type: NodeType.CHECKLIST,
        // icon: "lucide:list-todo"
        icon: "ph:list-checks-light",
        isShowShortcut: true
      }
    ]
  };

  let inlineSection: IBlockBrowserSection = {
    section: "inline",
    children: [
      {
        label: "Mention",
        description: "Mention a node or a collection",
        type: InlineType.MENTION,
        icon: "at-symbol",
        isShowShortcut: true
      },
      {
        label: "Date",
        description: "Mention a date",
        type: InlineType.DATE,
        icon: "calendar-days",
        badge: "planned",
        isDisabled: true
      },
      {
        label: "Mention link",
        description: "Mention a link",
        type: InlineType.LINK_MENTION,
        icon: "ph:link",
        badge: "planned",
        isDisabled: true
      }
    ]
  };
  let headingsSection = resolveHeadingSection();
  let textSection: IBlockBrowserSection = {
    section: "Text",
    children: [
      {
        label: "Paragraph",
        description: "Paragraph block",
        type: NodeType.SIMPLE_TEXT,
        icon: "ph:paragraph-light"
      },
      {
        label: "Quote",
        description: "Quote block",
        type: NodeType.QUOTE,
        icon: "ph:quotes-light",
        isShowShortcut: true
      },
      {
        label: "Callout",
        description: "Callout block",
        type: NodeType.CALLOUT,
        icon: "ph:info-light",
        isShowShortcut: true
      },
      {
        label: "Code",
        description: "Code block",
        type: NodeType.CODE,
        icon: "ph:code-block-light",
        isShowShortcut: true
      },
      {
        label: "Latex",
        description: "Latex block",
        type: NodeType.LATEX,
        icon: "ph:sigma-light",
        badge: "planned",
        isDisabled: true
      }
    ]
  };

  let config: IBlockBrowserSection[] =
    $context.embed === Embed.HANDSET
      ? [textSection, headingsSection, listsSection]
      : [
          textSection,
          headingsSection,
          listsSection,
          mediaSection,
          layoutSection,
          embedSection
        ];

  let filteredResults: any[] = config
    .map((section) => {
      return {
        section: section.section,
        children: section.children
          .filter((c) => !c.isDisabled)
          .map((c) => {
            return {
              ...c,
              section: section.section
            };
          })
      };
    })
    .filter((section) => section.children.length > 0);
  selectedSection = filteredResults[0].section;
  focusedItem = filteredResults[0].children[0];
  /**
   * @readonly
   */
  export let searchQueryString = "";

  function mapSectionNameToBlock(c: any, sectionName: string) {
    return {
      ...c,
      section: sectionName
    };
  }

  function allFilteredBlocks() {
    if (searchQueryString) {
      return filteredResults
        .map((section) =>
          section.children.map((c: any) =>
            mapSectionNameToBlock(c, section.section)
          )
        )
        .flat();
    } else {
      return config
        .map((section) =>
          section.children.map((c: any) =>
            mapSectionNameToBlock(c, section.section)
          )
        )
        .flat();
    }
  }

  export function key(key: "ArrowUp" | "ArrowDown" | "Enter") {
    let blocks = allFilteredBlocks();
    let index = blocks.indexOf(
      blocks.find((k: any) => compareBlock(k, focusedItem))
    );
    if (key === "ArrowUp") {
      if (index > 0) {
        focusedItem = blocks[index - 1];
      }
    } else if (key === "ArrowDown") {
      if (index < blocks.length - 1) {
        focusedItem = blocks[index + 1];
      }
    } else if (key === "Enter") {
      onSelection();
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
    filteredResults = config
      .filter((section) => !section.isDisabled)
      .map((section) => {
        return {
          section: section.section,
          children: section.children
            .map((c) => mapSectionNameToBlock(c, section.section))
            .filter((block) => !block.isDisabled)
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

  function onSelection(e?: CustomEvent) {
    const item = e?.detail || focusedItem;
    if (item.isDisabled) return;
    dispatch("select", item);
    onSelect(item);
  }

  function compareBlock(a: any, b: any) {
    return a.type + a.sub === b.type + b.sub;
  }

  function resolveHeadingSection(): IBlockBrowserSection {
    const contentType = nodeContext?.contentType;
    const isHeading1Disabled =
      contentType === NodeType.HEADING1 ||
      contentType === NodeType.HEADING2 ||
      contentType === NodeType.HEADING3 ||
      contentType === NodeType.HEADING4;
    const isHeading2Disabled =
      contentType === NodeType.HEADING2 ||
      contentType === NodeType.HEADING3 ||
      contentType === NodeType.HEADING4;
    const isHeading3Disabled =
      contentType === NodeType.HEADING3 || contentType === NodeType.HEADING4;
    const isHeading4Disabled = contentType === NodeType.HEADING4;
    const tooltip =
      "Some headings are not available when a heading is zoomed in";
    return {
      section: "headings",
      children: [
        {
          label: "Heading 1",
          description: "Heading 1 block",
          type: NodeType.HEADING1,
          // icon: "lucide:heading-1"
          icon: "ph:text-h-one-light",
          isShowShortcut: true,
          isDisabled: isHeading1Disabled,
          badge: isHeading1Disabled ? "NA" : undefined,
          tooltip: isHeading1Disabled ? tooltip : undefined
        },
        {
          label: "Heading 2",
          description: "Heading 2 block",
          type: NodeType.HEADING2,
          // icon: "lucide:heading-2"
          icon: "ph:text-h-two-light",
          isShowShortcut: true,
          isDisabled: isHeading2Disabled,
          badge: isHeading2Disabled ? "NA" : undefined,
          tooltip: isHeading2Disabled ? tooltip : undefined
        },
        {
          label: "Heading 3",
          description: "Heading 3 block",
          type: NodeType.HEADING3,
          // icon: "lucide:heading-3"
          icon: "ph:text-h-three-light",
          isShowShortcut: true,
          isDisabled: isHeading3Disabled,
          badge: isHeading3Disabled ? "NA" : undefined,
          tooltip: isHeading3Disabled ? tooltip : undefined
        },
        {
          label: "Heading 4",
          description: "Heading 4 block",
          type: NodeType.HEADING4,
          // icon: "lucide:heading-4"
          icon: "ph:text-h-four-light",
          isShowShortcut: true,
          isDisabled: isHeading4Disabled,
          badge: isHeading4Disabled ? "NA" : undefined,
          tooltip: isHeading4Disabled ? tooltip : undefined
        }
        // {
        //   label: "Heading 5",
        //   description: "Heading 5 block",
        //   type: NodeType.HEADING5,
        //   icon: "lucide:heading-5"
        // }
      ]
    };
  }
</script>

<div
  class={cn(
    "blockbrowser bg-bgs1 border border-brs2 backdrop-blur h-[30rem] rounded-md flex flex-col gap-6 overflow-auto styledscroll",
    {
      "w-72": searchQueryString || isSingleColumnMode,
      "w-[30rem]": !searchQueryString && !isSingleColumnMode,
      "p-2 pb-10": variant === "v1" || searchQueryString || isSingleColumnMode
    }
  )}
>
  {#if variant === "v1" || searchQueryString || isSingleColumnMode}
    {#if isValidArrayWithData(filteredResults)}
      {#each filteredResults as section}
        <div class="flex flex-col items-start gap-2">
          <div class="flex px-2">
            <Text content={section.section} style={TextStyle.SECTION_HEADING} />
          </div>
          <div class="flex flex-wrap w-full">
            {#each section.children as block}
              <BlockItem
                {block}
                on:select={onSelection}
                isFocused={compareBlock(focusedItem, block)}
                width={searchQueryString || isSingleColumnMode
                  ? "w-full min-w-full"
                  : "w-52"}
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
          {#each config as section}
            <button
              class={cn(
                "flex items-center gap-3 hover:bg-bgs3 py-2 px-2 rounded-md text-h5",
                {
                  "bg-bgs3 font-medium": selectedSection === section.section,
                  "font-light": selectedSection !== section.section,
                  "opacity-70": section.isDisabled
                }
              )}
              on:click|stopPropagation={() =>
                (selectedSection = section.section)}
            >
              <div class="text-left">{properCase(section.section)}</div>
              {#if section.badge}
                <Badge text={section.badge} />
              {/if}
            </button>
          {/each}
        </div>
      </aside>
      <div
        class="flex flex-col py-4 px-2 w-72 overflow-auto styledscroll pb-20"
      >
        {#each config as section}
          {#if section.section === selectedSection}
            {#each section.children as block}
              <BlockItem
                {block}
                on:select={onSelection}
                isFocused={compareBlock(focusedItem, block)}
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

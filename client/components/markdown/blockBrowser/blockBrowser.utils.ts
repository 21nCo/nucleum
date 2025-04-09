import { NodeType } from "$lib/client/products/memotron/node/node.type";
import { Embed } from "$lib/client/types/context.type";
import { InlineType } from "../md.type";
import type {
  IBlockBrowserItem,
  IBlockBrowserSection
} from "./blockBrowser.type";

const embedBrowserItem: IBlockBrowserItem = {
  label: "Embed anything",
  description: "Embed block",
  type: NodeType.EMBED,
  icon: "ph:code-light"
};

let embedSection: IBlockBrowserSection = {
  section: "embed",
  children: [
    embedBrowserItem,
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
    // {
    //   label: "Task",
    //   description: "Embed Task block",
    //   type: NodeType.TASK_AS_EMBED,
    //   icon: "ph:check-square-light"
    // },
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

const dividerBrowserBlockItems: IBlockBrowserItem[] = [
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
  }
];

let layoutSection: IBlockBrowserSection = {
  section: "layout",
  children: [
    ...dividerBrowserBlockItems,
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

const imageBrowserItem: IBlockBrowserItem = {
  label: "Image",
  description: "Image block",
  type: NodeType.IMAGE,
  icon: "ph:image-light"
};

let mediaSection: IBlockBrowserSection = {
  section: "media",
  children: [
    imageBrowserItem,
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

const orderedListBrowserItem: IBlockBrowserItem = {
  label: "Ordered List",
  description: "Ordered List block",
  type: NodeType.ORDERED_LIST,
  // icon: "lucide:list-ordered"
  icon: "ph:list-numbers-light",
  isShowShortcut: true
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
    orderedListBrowserItem,
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

export const paragraphBrowserItem: IBlockBrowserItem = {
  label: "Paragraph",
  description: "Paragraph block",
  type: NodeType.SIMPLE_TEXT,
  icon: "ph:paragraph-light"
};
export const quoteBrowserItem: IBlockBrowserItem = {
  label: "Quote",
  description: "Quote block",
  type: NodeType.QUOTE,
  icon: "ph:quotes-light",
  isShowShortcut: true
};
export const calloutBrowserItem: IBlockBrowserItem = {
  label: "Callout",
  description: "Callout block",
  type: NodeType.CALLOUT,
  icon: "ph:info-light",
  isShowShortcut: true
};
export const codeBrowserItem: IBlockBrowserItem = {
  label: "Code",
  description: "Code block",
  type: NodeType.CODE,
  icon: "ph:code-block-light",
  isShowShortcut: true
};
export const latexBrowserItem: IBlockBrowserItem = {
  label: "Latex",
  description: "Latex block",
  type: NodeType.LATEX,
  icon: "ph:sigma-light",
  badge: "planned",
  isDisabled: true
};

let textSection: IBlockBrowserSection = {
  section: "Text",
  children: [
    paragraphBrowserItem,
    quoteBrowserItem,
    calloutBrowserItem,
    codeBrowserItem,
    latexBrowserItem
  ]
};

function resolveHeadingSection(contentType: NodeType): IBlockBrowserSection {
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
  const tooltip = "Some headings are not available when a heading is zoomed in";
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

export function resolveBlockBrowserConfig(params: {
  contentType: NodeType;
  context: any;
}) {
  let headingsSection = resolveHeadingSection(params.contentType);
  //   if (params.context.embed === Embed.HANDSET) {
  //     return [textSection, headingsSection];
  //   }
  return [
    textSection,
    headingsSection,
    listsSection,
    mediaSection,
    layoutSection,
    embedSection
  ];
}

export function resolveBlockBrowserConfigOnKeyboard(params: {
  contentType: NodeType;
  context: any;
}) {
  let headingsSection = resolveHeadingSection(params.contentType);
  //   if (params.context.embed === Embed.HANDSET) {
  //     return [textSection, headingsSection];
  //   }
  return {
    config: [
      {
        section: "quick",
        children: [
          calloutBrowserItem,
          orderedListBrowserItem,
          imageBrowserItem,
          embedBrowserItem
        ]
      },
      {
        section: "text",
        children: []
      },
      mediaSection,
      {
        section: "layout",
        children: [...dividerBrowserBlockItems]
      },
      embedSection
    ],
    listsSection,
    headingsSection
  };
}

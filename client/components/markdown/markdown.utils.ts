import type {
  IBlockInterface,
  IMarkdownStore,
  ListBlockWithChildren,
  IMarkdown,
  IBlock,
  IEscapeShortcut
} from "$lib/client/components/markdown/md.type";
import {
  type ListChild,
  type ListContent,
  type INode,
  type IActiveNode,
  type SimpleTextNodeType,
  NodeType
} from "$lib/client/products/memotron/node/node.type";
import { deepCopy } from "$lib/shared/utils/obj.utils";

/**
 * Recursively extracts all children of a node and its children. Useful for converting a nested structure of node into a flat array.
 * @param md Node markdown with children in each node
 * @returns children of the node and all its children
 */
export function recursivelyExtractAllChildrenIntoArray(md: IActiveNode) {
  try {
    let children: IBlockInterface[] = [];

    if (md.children && md.children.length > 0) {
      md.children.forEach((child) => {
        children.push(child);
        children.push(...recursivelyExtractAllChildrenIntoArray(child));
      });
    }
    return children;
  } catch (e) {
    return [];
  }
}

/**
 * @deprecated - no longer used
 * @param mdStore
 * @returns
 */
export function parseBlocksIntoNestedMd(mdStore: IMarkdownStore) {
  const md = deepCopy(mdStore.node);
  md.children = recursivelyFormParentFromChildren(
    mdStore.blocks,
    md.childrenHierarchy
  );
  return md;
}

/**
 * @deprecated - no longer used
 * @param blocks
 * @param childrenHierarchy
 * @returns
 */
export function recursivelyFormParentFromChildren(
  blocks: IBlockInterface[],
  childrenHierarchy: string[] | undefined
) {
  let children: INode[] = [];
  if (childrenHierarchy && childrenHierarchy.length > 0) {
    childrenHierarchy.forEach((childId) => {
      const child = blocks.find((b) => b.id === childId);
      if (child) {
        const newChild: INode = {
          ...child,
          children: recursivelyFormParentFromChildren(
            blocks,
            child.childrenHierarchy
          )
        };
        children.push(newChild);
      }
    });
  }
  return children;
}
/**
 * @deprecated
 * @param store
 * @param contextBlockId
 * @param newBlock
 * @param isStructuralBlock
 * @returns
 */
export function handleNodeMarkdownChildHierarchyChanges(
  store: IMarkdownStore,
  contextBlockId: string,
  newBlock: IBlockInterface,
  isStructuralBlock: boolean
) {
  if (!store.params?.isNodular) return store;
  const parent = store.blocks.find((b) =>
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
      )
    ];
  }
  return store;
}

/**
 * Iterator function to find the child that matches the childId to ultimately arrive at the deep nesting and insert the new block
 * @param block parent block
 * @param childId the id of the child to find
 * @returns blocks of the child that matches the childId
 */
function getChild(block: ListBlockWithChildren, childId: string) {
  return block.children.find((b) => b.id === childId) as ListChild<
    Required<Pick<ListContent, "children">>
  >;
}

export function resolveImmediateParent(
  mdBlocks: IBlockInterface[],
  parentHierarchy: string[]
) {
  const topMostParentId = parentHierarchy.shift();
  const topMostParent = mdBlocks.find((b) => b.id === topMostParentId);
  let iterParent: ListBlockWithChildren = topMostParent as IBlockInterface<
    Required<Pick<ListContent, "children">>
  >;
  let parentOneAbove: ListBlockWithChildren | undefined;
  parentHierarchy.forEach((item, index) => {
    parentOneAbove = iterParent;
    iterParent = getChild(iterParent, item);
  });
  return { parent: iterParent, parentOneAbove };
}

function encapsulateInlinePattern(
  keyword: string,
  content: string,
  isEncapsulate = false
) {
  if (!isEncapsulate) return content;
  return `<span class='hidden'>${keyword}</span> ${content} <span class='hidden'>${keyword}</span>`;
}

export const inlineStylingPatterns = [
  {
    regex: /(?<!\*)\*([^\*]+?)\*(?!\*)/g,
    replacement: encapsulateInlinePattern("*", "<i>$1</i>")
  },
  {
    regex: /\*\*([^\*]+?)\*\*/g,
    replacement: encapsulateInlinePattern("**", "<b>$1</b>")
  },
  {
    // regex: /_((?:\s*\S)+?)_/g,
    regex: /__(.*?)__/g,
    replacement: encapsulateInlinePattern("__", "<u>$1</u>")
  },
  {
    regex: /~~((?:\S|\s\S)+?)~~/g,
    replacement: encapsulateInlinePattern("~~", "$1")
    // '<span class="line-through">$1</span>'
  },
  {
    regex: /`([^`]+)`(?!`)/g,
    // replacement: encapsulateInlinePattern("`", "<code>$1</code>")
    replacement: encapsulateInlinePattern(
      "`",
      "<span class='bg-aps2 px-0.5 text-b2 font-mono'>$1</span>"
    )
  }
  // {
  //   regex: /#\[((?:\S|\s\S)+?)\]\(([^)]+?)\)/g,
  //   replacement: '<span style="color:$2">$1</span>'
  // }
];

export const symbolPatterns = [
  { regex: /←&gt;/g, replacement: "↔" },
  { regex: /-&gt;/g, replacement: "→" },
  { regex: /&lt;-/g, replacement: "←" },
  { regex: /&lt;=/g, replacement: "≤" },
  { regex: /&gt;=/g, replacement: "≥" },
  { regex: /=&gt;/g, replacement: "⇒" }
];

/**
 * Renders markdown as html. It replaces symbols, inline styles and spaces with html entities.
 *
 * In cases of search results, where parts of the text are highlighted, plain text spaces are not rendered correctly. To avoid this, spaces are rendered as &nbsp; when isIncludeSpaces is true.
 *
 * @param text
 * @param params
 * @returns
 */
export function renderMdAsHtml(
  text: string,
  params?: {
    isIncludeSpaces?: boolean;
  }
) {
  let parsedText = text;
  parsedText = replaceSymbolPatterns(parsedText);
  parsedText = replaceInlineStylePatterns(parsedText);
  parsedText = parsedText.replace(/\n/g, "<br>");
  parsedText = parsedText.replace(
    /\[(.*?)\]\(resource=(.*?)\)/g,
    '<a class="mention text-aps1 underline-dotted-primary" id="$2" href="?pop=$2">$1</a>'
  );
  if (params?.isIncludeSpaces) parsedText = parsedText.replace(/ /g, "&nbsp;");
  return parsedText;
}
type MatchPattern = {
  match: RegExpExecArray;
  pattern: { regex: RegExp; replacement: string };
};
/**
 * Finds all inline styling patterns in a given text and returns the matches. If no matches are found, an empty array is returned.
 * @param text Text to find inline styling patterns
 * @returns matches of inline styling patterns
 */
export function findInlineStylingPatterns(text: string) {
  let matches: MatchPattern[] = [];
  inlineStylingPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({ match, pattern });
    }
  });
  return matches;
}

export function findSymbolPatterns(text: string) {
  let matches: RegExpExecArray[] = [];
  symbolPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push(match);
    }
  });
  return matches;
}

export function replaceInlineStylePatterns(text: string) {
  let html = text;
  inlineStylingPatterns.forEach((pattern) => {
    html = html.replace(pattern.regex, pattern.replacement);
  });
  return html;
}

export function replaceSymbolPatterns(text: string) {
  let html = text;
  symbolPatterns.forEach((pattern) => {
    html = html.replace(pattern.regex, pattern.replacement);
  });
  return html;
}

export function isEmptyMd(md: IBlock[]) {
  return (
    md?.length === 0 ||
    (md?.length === 1 && "body" in md[0] && md[0].body === "")
  );
}

export const htmlToMarkdownPatterns = [
  {
    regex: /<i>(.*?)<\/i>/g,
    replacement: "*$1*"
  },
  {
    regex: /<b>(.*?)<\/b>/g,
    replacement: "**$1**"
  },
  {
    regex: /<u>(.*?)<\/u>/g,
    replacement: "__$1__"
  },
  {
    regex: /<s>(.*?)<\/s>/g,
    replacement: "~~$1~~"
  },
  {
    regex:
      /<span class=["']bg-aps2 px-0.5 text-b2 font-mono["']>(.*?)<\/span>/g,
    replacement: "`$1`"
  },
  {
    regex:
      /<button[^>]*id=\"(.*?)\"[^>]*class=\".*?mention.*?\"[^>]*>(.*?)<\/button>/g,
    replacement: (match, id, label) => `[${label}](resource=${id})`
  }
];

function replaceNestedSpans(html: string): string {
  const spanRegex = /<span[^>]*>(.*?)<\/span>/gs;
  let replacedHtml = html;
  let previousHtml = "";
  while (previousHtml !== replacedHtml) {
    previousHtml = replacedHtml;
    replacedHtml = replacedHtml.replace(spanRegex, (_, group1) =>
      group1.replace(/&nbsp;/g, " ")
    );
  }
  return replacedHtml;
}

function removeHtmlComments(html: string): string {
  const commentRegex = /<!--(.*?)-->/gs;
  let replacedHtml = html;
  let previousHtml = "";
  while (previousHtml !== replacedHtml) {
    previousHtml = replacedHtml;
    replacedHtml = replacedHtml.replace(commentRegex, "");
  }
  return replacedHtml;
}

function removeTooltipElements(html: string): string {
  const tooltipElementRegex =
    /<(\w+)[^>]*class="[^"]*tooltip[^"]*">[\s\S]*?<\/\1>/gs;
  let replacedHtml = html;
  let previousHtml = "";
  while (previousHtml !== replacedHtml) {
    previousHtml = replacedHtml;
    replacedHtml = replacedHtml.replace(tooltipElementRegex, "");
  }
  return replacedHtml;
}

export function extractInlineMarkdownFromHtml(html: any) {
  let markdown = html;
  htmlToMarkdownPatterns.forEach((pattern) => {
    markdown = markdown.replaceAll(pattern.regex, pattern.replacement);
  });
  markdown = replaceNestedSpans(markdown);
  markdown = removeHtmlComments(markdown);
  markdown = removeTooltipElements(markdown);
  return markdown;
}

export function resolvePlainText(mdString: string) {
  return mdString
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/#+\s*(.*)/g, "$1")
    .replace(/^>\s*(.*)/gm, "$1")
    .replace(/^[\-\*\+]\s+(.*)/gm, "$1")
    .replace(/^\d+\.\s+(.*)/gm, "$1")
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "")
    .replace(/([#>*_~`]+)/g, "")
    .trim();
}

function createPositionMapping(markdown: string): {
  plainText: string;
  mapping: number[];
} {
  let plainText = "";
  let mapping: number[] = []; // mapping[plainIndex] = markdownIndex
  let markdownIndex = 0;
  let plainIndex = 0;

  const length = markdown.length;
  while (markdownIndex < length) {
    const patterns = [
      { type: "formatting", regex: /^(?:\*\*|__)/, length: 2 },
      {
        type: "formatting",
        regex: /^(?:\*|_|~~)/,
        length: (match: string) => match.length
      },
      { type: "formatting", regex: /^`/, length: 1 },
      {
        type: "link",
        regex: /^\[([^\]]+)\]\([^\)]+\)/,
        length: (match: string) => match.length
      },
      {
        type: "image",
        regex: /^!\[([^\]]*)\]\([^\)]+\)/,
        length: (match: string) => match.length
      },
      {
        type: "heading",
        regex: /^(#+\s+)/,
        length: (match: string) => match.length
      },
      {
        type: "blockquote",
        regex: /^(>\s+)/,
        length: (match: string) => match.length
      },
      {
        type: "unordered-list",
        regex: /^([\-\*\+]\s+)/,
        length: (match: string) => match.length
      },
      {
        type: "ordered-list",
        regex: /^(\d+\.\s+)/,
        length: (match: string) => match.length
      },
      {
        type: "horizontal-rule",
        regex: /^((?:-){3,}|(?:\*){3,}|(?:_){3,})(\n|$)/,
        length: (match: string) => match.length
      },
      { type: "newline", regex: /^\n/, length: 1 },
      { type: "any-other", regex: /^./, length: 1 }
    ];

    let matched = false;

    for (const pattern of patterns) {
      const match = markdown.substring(markdownIndex).match(pattern.regex);
      if (match) {
        const matchLength =
          typeof pattern.length === "function"
            ? pattern.length(match[0])
            : pattern.length;

        if (pattern.type === "link") {
          const linkText = match[1];
          for (let i = 0; i < linkText.length; i++) {
            plainText += linkText[i];
            mapping[plainIndex++] = markdownIndex + 1 + i;
          }
        } else if (pattern.type === "image") {
          // Image syntax, skip
        } else if (pattern.type === "formatting") {
          // Formatting syntax, skip the syntax characters
        } else if (
          pattern.type === "heading" ||
          pattern.type === "blockquote" ||
          pattern.type === "unordered-list" ||
          pattern.type === "ordered-list" ||
          pattern.type === "horizontal-rule"
        ) {
        } else if (pattern.type === "newline") {
          plainText += "\n";
          mapping[plainIndex++] = markdownIndex;
        } else if (pattern.type === "any-other") {
          plainText += match[0];
          mapping[plainIndex++] = markdownIndex;
        }

        markdownIndex += matchLength;
        matched = true;
        break;
      }
    }

    if (!matched) {
      markdownIndex++;
    }
  }

  return { plainText, mapping };
}

function createPositionMappingv2(markdown: string): {
  plainText: string;
  mapping: number[];
} {
  let plainText = "";
  let mapping: number[] = []; // mapping[plainIndex] = markdownIndex
  let markdownIndex = 0;
  let plainIndex = 0;

  const length = markdown.length;
  while (markdownIndex < length) {
    const char = markdown[markdownIndex];

    // Handling formatting characters
    if (
      (char === "*" && markdown[markdownIndex + 1] === "*") ||
      (char === "_" && markdown[markdownIndex + 1] === "_")
    ) {
      // Skip the double formatting characters (bold or underline)
      markdownIndex += 2;
      continue;
    } else if (char === "*" || char === "_" || char === "~" || char === "`") {
      // Skip single formatting characters (italic, strikethrough, code)
      markdownIndex += 1;
      continue;
    }

    // Handle links
    if (char === "[") {
      const linkMatch = markdown
        .substring(markdownIndex)
        .match(/^\[([^\]]+)\]\([^\)]+\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        for (let i = 0; i < linkText.length; i++) {
          plainText += linkText[i];
          mapping[plainIndex++] = markdownIndex + 1 + i;
        }
        markdownIndex += linkMatch[0].length;
        continue;
      }
    }

    // Handle images
    if (char === "!" && markdown[markdownIndex + 1] === "[") {
      const imageMatch = markdown
        .substring(markdownIndex)
        .match(/^!\[[^\]]*\]\([^\)]+\)/);
      if (imageMatch) {
        // Skip the entire image syntax
        markdownIndex += imageMatch[0].length;
        continue;
      }
    }

    // Add character to plain text and update mapping
    plainText += char;
    mapping[plainIndex++] = markdownIndex++;
  }

  return { plainText, mapping };
}

function resolveMarkdownOffset(plainOffset: number, mapping: number[]): number {
  if (plainOffset < 0 || plainOffset >= mapping.length) {
    throw new Error("Plain text offset is out of bounds");
  }
  return mapping[plainOffset];
}

export function resolvePlainOffsetForMdEnd(markdown: string) {
  const plainText = resolvePlainText(markdown);
  return plainText.length;
}

export function splitMarkdownAtPlainOffset(
  markdown: string,
  plainOffset: number
): { before: string; after: string } {
  const { plainText, mapping } = createPositionMapping(markdown);
  const markdownOffset = resolveMarkdownOffset(plainOffset, mapping);
  const before = markdown.substring(0, markdownOffset);
  const after = markdown.substring(markdownOffset);

  if (before.endsWith("**")) {
    return { before: before.slice(0, -2), after: "**" + after };
  }
  if (before.endsWith("__")) {
    return { before: before.slice(0, -2), after: "__" + after };
  }
  if (before.endsWith("[[")) {
    return { before: before.slice(0, -2), after: "[[" + after };
  }
  if (
    before[before.length - 1] === "*" ||
    before[before.length - 1] === "_" ||
    before[before.length - 1] === "~" ||
    before[before.length - 1] === "`" ||
    before[before.length - 1] === "["
  ) {
    const lastChar = before[before.length - 1];
    return {
      before: before.slice(0, -1),
      after: lastChar + after
    };
  }

  return { before, after };
}

function getEscapeShortcuts(nodeContentType: NodeType) {
  const textEscapeShortcuts: IEscapeShortcut[] = [
    { shortcut: '" ', type: NodeType.QUOTE },
    { shortcut: "> ", type: NodeType.QUOTE },
    { shortcut: "&gt; ", type: NodeType.QUOTE },
    { shortcut: "! ", type: NodeType.CALLOUT },
    { shortcut: "```", type: NodeType.CODE }
  ];
  if (nodeContentType !== NodeType.HEADING4) {
    textEscapeShortcuts.unshift({
      shortcut: "#### ",
      type: NodeType.HEADING4
    });
  }
  if (![NodeType.HEADING3, NodeType.HEADING4].includes(nodeContentType)) {
    textEscapeShortcuts.unshift({
      shortcut: "### ",
      type: NodeType.HEADING3
    });
  }
  if (
    ![NodeType.HEADING2, NodeType.HEADING3, NodeType.HEADING4].includes(
      nodeContentType
    )
  ) {
    textEscapeShortcuts.unshift({
      shortcut: "## ",
      type: NodeType.HEADING2
    });
  }
  if (
    ![
      NodeType.HEADING1,
      NodeType.HEADING2,
      NodeType.HEADING3,
      NodeType.HEADING4
    ].includes(nodeContentType)
  ) {
    textEscapeShortcuts.unshift({
      shortcut: "# ",
      type: NodeType.HEADING1
    });
  }

  const structuralEscapeShortcuts: IEscapeShortcut[] = [
    { shortcut: "---", type: NodeType.DIVIDER },
    { shortcut: "===", type: NodeType.DOUBLE_DIVIDER }
  ];

  const listEscapeShortcuts: IEscapeShortcut[] = [
    { shortcut: "* ", type: NodeType.LIST, indentable: true },
    { shortcut: "- ", type: NodeType.LIST, indentable: true },
    { shortcut: "+ ", type: NodeType.CHECKLIST, indentable: true },
    { shortcut: "1. ", type: NodeType.ORDERED_LIST, indentable: true }
  ];

  return {
    textEscapeShortcuts,
    structuralEscapeShortcuts,
    listEscapeShortcuts
  };
}

export function performEscShortcuts(
  nodeContentType: NodeType,
  text: string
): {
  shortcut: string;
  type: NodeType;
  indentLevel?: number;
  isFullReplace?: boolean;
} | null {
  const {
    textEscapeShortcuts,
    structuralEscapeShortcuts,
    listEscapeShortcuts
  } = getEscapeShortcuts(nodeContentType);

  let shortcut: string | undefined = undefined;
  let type: NodeType | undefined = undefined;
  let indentLevel: number | undefined = undefined;

  [...textEscapeShortcuts, ...listEscapeShortcuts].forEach(
    ({ shortcut: short, type: t, indentable }) => {
      indentLevel = getIndentationLevel(text);
      const trimmedText = text.trimStart();
      const _text = indentable ? trimmedText : text;

      if (_text.startsWith(short)) {
        shortcut = short;
        type = t;
      }
    }
  );
  if (shortcut && type) {
    return { shortcut, type, indentLevel };
  }

  structuralEscapeShortcuts.forEach(({ shortcut: short, type: t }) => {
    if (text === short) {
      shortcut = short;
      type = t;
    }
  });
  if (shortcut && type) {
    return { shortcut, type, isFullReplace: true };
  }

  return null;

  function getIndentationLevel(text: string): number {
    const leadingWhitespace = text.match(/^(\s*)/)?.[1] || "";
    const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
    const spaceCount = leadingWhitespace.replace(/\t/g, "").length;
    const spaceIndents = Math.floor(spaceCount / 4);
    return tabCount + spaceIndents;
  }
}

import type {
  IBlock,
  IMarkdownStore,
  ListBlockWithChildren,
  IMarkdown
} from "$lib/client/types/memotron/md.type";
import type {
  ListChild,
  ListContent,
  INode
} from "$lib/client/types/memotron/node.type";
import { deepCopy } from "$lib/client/utils/obj.utils";

/**
 * Recursively extracts all children of a node and its children. Useful for converting a nested structure of node into a flat array.
 * @param md Node markdown with children in each node
 * @returns children of the node and all its children
 */
export function recursivelyExtractAllChildrenIntoArray(md: INode) {
  let children: IBlock[] = [];
  if (md.children && md.children.length > 0) {
    md.children.forEach((child) => {
      children.push(child);
      children.push(...recursivelyExtractAllChildrenIntoArray(child));
    });
  }
  return children;
}

export function parseBlocksIntoNestedMd(mdStore: IMarkdownStore) {
  const md = deepCopy(mdStore.node);
  md.children = recursivelyFormParentFromChildren(
    mdStore.blocks,
    md.childrenHierarchy
  );
  return md;
}

export function recursivelyFormParentFromChildren(
  blocks: IBlock[],
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
  newBlock: IBlock,
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
  mdBlocks: IBlock[],
  parentHierarchy: string[]
) {
  const topMostParentId = parentHierarchy.shift();
  const topMostParent = mdBlocks.find((b) => b.id === topMostParentId);
  let iterParent: ListBlockWithChildren = topMostParent as IBlock<
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
    regex: /_(.*?)_/g,
    replacement: encapsulateInlinePattern("_", "<u>$1</u>")
  },
  {
    regex: /~~((?:\S|\s\S)+?)~~/g,
    replacement: encapsulateInlinePattern("~~", "<s>$1</s>")
    // '<span class="line-through">$1</span>'
  },
  {
    regex: /`((?:\S|\s\S)+?)`/g,
    // replacement: encapsulateInlinePattern("`", "<code>$1</code>")
    replacement: encapsulateInlinePattern(
      "`",
      "<span class='bg-aps2 px-1 font-mono'>$1</span>"
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

export function renderMdAsHtml(text: string) {
  let parsedText = text;
  inlineStylingPatterns.forEach((pattern) => {
    parsedText = parsedText.replace(pattern.regex, pattern.replacement);
  });
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

export function isEmptyMd(md: IMarkdown) {
  return (
    md?.blocks?.length === 0 ||
    (md?.blocks?.length === 1 &&
      "body" in md.blocks[0] &&
      md.blocks[0].body === "")
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
    replacement: "_$1_"
  },
  {
    regex: /<s>(.*?)<\/s>/g,
    replacement: "~~$1~~"
  },
  {
    regex: /<span class=["']bg-aps2 px-1 font-mono["']>(.*?)<\/span>/g,
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

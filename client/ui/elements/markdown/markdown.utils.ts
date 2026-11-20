import { InlineType } from "./inline.type";

/** Encapsulate inline pattern for shared inline Markdown presentation. */
function encapsulateInlinePattern(
  keyword: string,
  content: string,
  isEncapsulate = false
) {
  if (!isEncapsulate) return content;
  return `<span class='hidden'>${keyword}</span> ${content} <span class='hidden'>${keyword}</span>`;
}

/** Inline styling patterns for shared inline Markdown presentation. */
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
    regex: /__(.*?)__/g,
    replacement: encapsulateInlinePattern("__", "<u>$1</u>")
  },
  {
    regex: /~~((?:\S|\s\S)+?)~~/g,
    replacement: encapsulateInlinePattern("~~", "$1")
  },
  {
    regex: /`([^`]+)`(?!`)/g,
    replacement: encapsulateInlinePattern(
      "`",
      "<span class='bg-aps2 px-0.5 text-b2 font-mono'>$1</span>"
    )
  }
];

/** Inline link patterns for shared inline Markdown presentation. */
export const inlineLinkPatterns = [
  {
    type: InlineType.MENTION,
    regex: /\[(.*?)\]\(resource=(.*?)\)/g,
    replacement:
      '<placeholder class="inline-mention" data-record-id="$2" data-label="$1" > $1 </placeholder>'
  },
  {
    type: InlineType.LINK,
    regex: /\[(.*?)\]\(https?:\/\/(.*?)\)/g,
    replacement:
      '<placeholder class="inline-link text-aps1 underline hover:bg-aps3 px-0.5 rounded-md cursor-pointer" data-href="https://$2" data-label="$1" >$1</placeholder>'
  }
];

/** Symbol patterns for shared inline Markdown presentation. */
export const symbolPatterns = [
  { regex: /←&gt;/g, replacement: "↔" },
  { regex: /-&gt;/g, replacement: "→" },
  { regex: /&lt;-/g, replacement: "←" },
  { regex: /&lt;=/g, replacement: "≤" },
  { regex: /&gt;=/g, replacement: "≥" },
  { regex: /=&gt;/g, replacement: "⇒" }
];

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/**
 * Escapes HTML delimiters so user text cannot inject markup through `renderMdAsHtml`.
 * Existing character references such as `&amp;` or `&#60;` are kept, so text that
 * callers already escaped (for example with `escapeMarkdownText`) is not escaped twice.
 */
export function escapeHtmlKeepingEntities(text: string): string {
  return text.replace(
    /&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);)|[<>"']/g,
    (char) => HTML_ESCAPES[char] ?? char
  );
}

/** Escapes HTML delimiters and inline Markdown syntax so user text renders literally through `renderMdAsHtml`. */
export function escapeMarkdownText(text: string): string {
  return text.replace(
    /[&<>"'*_~`[\]\\]/g,
    (char) => `&#${char.charCodeAt(0)};`
  );
}

const TOKEN_START = "\uFFF0";
const TOKEN_END = "\uFFF1";
const QUOTE_MARKER = "\uFFF2";
const RESERVED_MARKERS = /[\uFFF0-\uFFF2]/g;
const TOKEN_PATTERN = /\uFFF0(\d+)\uFFF1/g;
const BLOCK_START_LINE =
  /^(?:#{1,4} |\uFFF2 |\s*[-*] |---\s*$|===\s*$|\s*$)/;

/**
 * Positions of the newlines that end a block: the following whole source line
 * starts a heading, quote, list item or rule, or is blank. Sorted ascending.
 */
function findBlockBoundaries(text: string) {
  const boundaries: number[] = [];
  let newline = text.indexOf("\n");
  while (newline >= 0) {
    const lineEnd = text.indexOf("\n", newline + 1);
    const line = text
      .slice(newline + 1, lineEnd < 0 ? text.length : lineEnd)
      .replace(/\r$/, "");
    if (BLOCK_START_LINE.test(line)) boundaries.push(newline);
    newline = lineEnd;
  }
  return boundaries;
}

/** Index of the first value in a sorted list that is at least `value`. */
function firstAtOrAfter(sorted: number[], value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Checks whether `[start, end)` contains no block boundary. */
function staysInBlock(boundaries: number[], start: number, end: number) {
  const index = firstAtOrAfter(boundaries, start);
  return index >= boundaries.length || boundaries[index] >= end;
}

/** Block boundaries and `](` positions of a text, computed once per render. */
type InlineLayout = { boundaries: number[]; closers: number[] };

function findLabelClosers(text: string) {
  const closers: number[] = [];
  let index = text.indexOf("](");
  while (index >= 0) {
    closers.push(index);
    index = text.indexOf("](", index + 1);
  }
  return closers;
}

/**
 * Renders mentions (`[label](resource=id)`) and links (`[label](https://...)`)
 * into placeholder tokens in one left-to-right pass, before any other HTML is
 * generated, so each link keeps its exact destination, no later pattern can
 * match across generated markup, and a link never spans a block boundary.
 */
function extractInlineLinks(text: string, tokens: string[]) {
  const [mentionPattern, linkPattern] = [
    inlineLinkPatterns.find((pattern) => pattern.type === InlineType.MENTION)!,
    inlineLinkPatterns.find((pattern) => pattern.type === InlineType.LINK)!
  ];
  const boundaries = findBlockBoundaries(text);
  const layout: InlineLayout = { boundaries, closers: findLabelClosers(text) };
  const brackets = matchLabelBrackets(text, boundaries);
  let result = "";
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("[", index);
    if (open < 0) break;
    const parsed = parseInlineLinkAt(text, open, brackets, layout);
    if (!parsed) {
      result += text.slice(index, open + 1);
      index = open + 1;
      continue;
    }
    const styledLabel = replaceInlineStylePatterns(
      replaceSymbolPatterns(parsed.label)
    ).replace(/\r?\n/g, "<br>");
    const target = parsed.target.replace(/\r?\n/g, "<br>");
    const template = parsed.isMention
      ? mentionPattern.replacement
      : linkPattern.replacement;
    tokens.push(
      template.replace(/\$([12])/g, (_placeholder, group: string) =>
        group === "1" ? styledLabel : target
      )
    );
    result += `${text.slice(index, open)}${TOKEN_START}${tokens.length - 1}${TOKEN_END}`;
    index = parsed.end;
  }
  return result + text.slice(index);
}

/**
 * Pairs every `[` with the `]` that balances it inside the same block, in one
 * pass. Unclosed brackets at a block boundary are dropped.
 */
function matchLabelBrackets(text: string, boundaries: number[]) {
  const matches = new Map<number, number>();
  const stack: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\n" && !staysInBlock(boundaries, index, index + 1)) stack.length = 0;
    else if (char === "[") stack.push(index);
    else if (char === "]") {
      const open = stack.pop();
      if (open !== undefined) matches.set(open, index);
    }
  }
  return matches;
}

/** Reads a `resource=` or `http(s)://` target that starts right after `](` at `close`. */
function readInlineTarget(
  text: string,
  open: number,
  close: number,
  boundaries: number[]
) {
  const rest = text.slice(close + 2);
  const prefix = rest.startsWith("resource=")
    ? "resource="
    : (/^https?:\/\//.exec(rest)?.[0] ?? null);
  if (!prefix) return null;
  const targetStart = close + 2 + prefix.length;
  const targetEnd = text.indexOf(")", targetStart);
  if (targetEnd < 0) return null;
  if (!staysInBlock(boundaries, targetStart, targetEnd)) return null;
  return {
    isMention: prefix === "resource=",
    label: text.slice(open + 1, close),
    target: text.slice(targetStart, targetEnd),
    end: targetEnd + 1
  };
}

/** Finds the nearest `](` after `from` in the same block that starts a valid target. */
function findFallbackClose(
  text: string,
  open: number,
  from: number,
  layout: InlineLayout
) {
  let index = firstAtOrAfter(layout.closers, from);
  while (index < layout.closers.length) {
    const close = layout.closers[index];
    if (!staysInBlock(layout.boundaries, open, close)) return -1;
    if (readInlineTarget(text, open, close, layout.boundaries)) return close;
    index += 1;
  }
  return -1;
}

/** True when a `[` between `from` and `to` starts its own complete link or mention. */
function startsCompleteInlineBetween(
  text: string,
  from: number,
  to: number,
  brackets: Map<number, number>,
  boundaries: number[]
) {
  for (let index = text.indexOf("[", from); index >= 0 && index < to; index = text.indexOf("[", index + 1)) {
    const close = brackets.get(index);
    if (close !== undefined && text[close + 1] === "(" && readInlineTarget(text, index, close, boundaries)) {
      return true;
    }
  }
  return false;
}

/**
 * Parses a link or mention starting at `open`. The label normally ends at the
 * `]` that balances `open` (extended over a run of `]`s, as in `[Happy :]]`).
 * Labels with unbalanced brackets, which mentions of such titles produce, fall
 * back to the nearest `](` in the block: always when `open` has no pair, and
 * when its pair is not followed by `(` and no complete link or mention starts
 * before that `](`.
 */
function parseInlineLinkAt(
  text: string,
  open: number,
  brackets: Map<number, number>,
  layout: InlineLayout
) {
  const { boundaries } = layout;
  let close = brackets.get(open) ?? -1;
  if (close < 0) {
    const fallback = findFallbackClose(text, open, open + 1, layout);
    return fallback < 0 ? null : readInlineTarget(text, open, fallback, boundaries);
  }
  if (!staysInBlock(boundaries, open, close)) return null;
  while (text[close + 1] === "]") close += 1;
  if (text[close + 1] === "(") {
    return readInlineTarget(text, open, close, boundaries);
  }
  const fallback = findFallbackClose(text, open, close + 1, layout);
  if (fallback < 0 || startsCompleteInlineBetween(text, close + 1, fallback, brackets, boundaries)) {
    return null;
  }
  return readInlineTarget(text, open, fallback, boundaries);
}

function restoreInlineLinks(text: string, tokens: string[]) {
  return text.replace(TOKEN_PATTERN, (_match, index: string) => tokens[Number(index)] ?? "");
}

/**
 * Renders the established Markdown display syntax without depending on editor state.
 * Input is HTML-escaped first, so the output only contains markup this function generates.
 */
export function renderMdAsHtml(
  text: string,
  params?: {
    isIncludeSpaces?: boolean;
    isPageRender?: boolean;
  }
) {
  const source = String(text ?? "")
    .replace(RESERVED_MARKERS, "")
    .replace(/^> /gm, `${QUOTE_MARKER} `);
  const tokens: string[] = [];
  let parsedText = extractInlineLinks(escapeHtmlKeepingEntities(source), tokens);
  parsedText = replaceSymbolPatterns(parsedText);
  parsedText = replaceInlineStylePatterns(parsedText);
  parsedText = parsedText.replace(
    /^#### (.*)$/gm,
    (match, content) => `<h4 class="text-h4">${content}</h4>`
  );
  parsedText = parsedText.replace(
    /^### (.*)$/gm,
    (match, content) =>
      `<h3 class="${params?.isPageRender ? "text-h3" : "text-h4"}">${content}</h3>`
  );
  parsedText = parsedText.replace(
    /^## (.*)$/gm,
    (match, content) =>
      `<h2 class="${params?.isPageRender ? "text-h2" : "text-h4"}">${content}</h2>`
  );
  parsedText = parsedText.replace(
    /^# (.*)$/gm,
    (match, content) =>
      `<h1 class="${params?.isPageRender ? "text-h1" : "text-h4"}">${content}</h1>`
  );
  parsedText = parsedText.replace(
    new RegExp(`^${QUOTE_MARKER} (.*)$`, "gm"),
    (match, content) => `<blockquote>${content}</blockquote>`
  );
  parsedText = parsedText.replace(/^---\s*$/gm, "<hr>");
  parsedText = parsedText.replace(/^===\s*$/gm, "<hr>");
  parsedText = parsedText.replace(
    /((^|\n)\s*[-*] .*(\n\s*[-*] .*)*)/gm,
    function (match: string) {
      const items = match
        .split(/\n/)
        .filter((line: string) => /^\s*[-*] /.test(line));
      if (items.length === 0) return match;
      const lis = items
        .map(
          (line: string) =>
            `<li class="md-list-item">${line.replace(/^\s*[-*] /, "")}</li>`
        )
        .join("");
      return `<ul>${lis}</ul>`;
    }
  );
  parsedText = parsedText.replace(/\n/g, "<br>");
  if (params?.isIncludeSpaces) parsedText = parsedText.replace(/ /g, "&nbsp;");
  return restoreInlineLinks(parsedText, tokens).replaceAll(QUOTE_MARKER, "&gt;");
}

/**  match pattern for shared inline Markdown presentation. */
type MatchPattern = {
  match: RegExpExecArray;
  pattern: {
    regex: RegExp;
    replacement: string;
  };
};

/** Find inline styling patterns for shared inline Markdown presentation. */
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

/** Find symbol patterns for shared inline Markdown presentation. */
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

/** Replace inline style patterns for shared inline Markdown presentation. */
export function replaceInlineStylePatterns(text: string) {
  let html = text;
  inlineStylingPatterns.forEach((pattern) => {
    html = html.replace(pattern.regex, pattern.replacement);
  });
  return html;
}

/** Replace inline link patterns for shared inline Markdown presentation. */
export function replaceInlineLinkPatterns(text: string) {
  let html = text;
  inlineLinkPatterns.forEach((pattern) => {
    html = html.replace(pattern.regex, pattern.replacement);
  });
  return html;
}

/** Replace symbol patterns for shared inline Markdown presentation. */
export function replaceSymbolPatterns(text: string) {
  let html = text;
  symbolPatterns.forEach((pattern) => {
    html = html.replace(pattern.regex, pattern.replacement);
  });
  return html;
}

/** Html to markdown patterns for shared inline Markdown presentation. */
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
      /<a[^>]*inline-mention.*?data-record-id="([^"]*)".*?data-label="([^"]*)".*?>.*?<\/a>/gs,
    replacement: (match: string, id: string, label: string) => {
      return `[${label}](resource=${id})`;
    }
  },
  {
    regex: /<a[^>]*inline-link[^>]*?href="([^"]*)"[^>]*?>([\s\S]*?)<\/a>/g,
    replacement: (match: string, url: string, label: string) => {
      return `[${label}](${url.startsWith("http") ? url : "https://" + url})`;
    }
  }
];

/** Replace nested spans for shared inline Markdown presentation. */
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

/** Remove html comments for shared inline Markdown presentation. */
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

/** Remove tooltip elements for shared inline Markdown presentation. */
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

/** Extract inline markdown from html for shared inline Markdown presentation. */
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

/** Resolve plain text for shared inline Markdown presentation. */
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

/** Create position mapping for shared inline Markdown presentation. */
function createPositionMapping(markdown: string): {
  plainText: string;
  mapping: number[];
} {
  let plainText = "";
  let mapping: number[] = [];
  let markdownIndex = 0;
  let plainIndex = 0;
  const patterns = [
    {
      type: "html-entity",
      regex: /^&(?:amp|lt|gt|quot|apos|dash|ndash|#\d+);/,
      length: (matchStr: string) => matchStr.length,
      transform: (matchStr: string) => {
        switch (matchStr) {
          case "&amp;":
            return "&";
          case "&lt;":
            return "<";
          case "&gt;":
            return ">";
          case "&quot;":
            return '"';
          case "&apos;":
            return "'";
          case "&dash;":
          case "&ndash;":
            return "–";
          default: {
            const numericMatch = matchStr.match(/^&#(\d+);$/);
            if (numericMatch) {
              return String.fromCharCode(parseInt(numericMatch[1], 10));
            }
            return matchStr;
          }
        }
      }
    },
    { type: "formatting", regex: /^(?:\*\*|__)/, length: 2 },
    {
      type: "formatting",
      regex: /^(?:\*|_|~~)/,
      length: (matchStr: string) => matchStr.length
    },
    { type: "formatting", regex: /^`/, length: 1 },
    {
      type: "link",
      regex: /^\[([^\]]+)\]\([^\)]+\)/,
      length: (matchStr: string) => matchStr.length,
      extract: (matchStr: string) => matchStr.match(/^\[([^\]]+)\]/)?.[1] || ""
    },
    { type: "any-other", regex: /^./, length: 1 }
  ];
  const length = markdown.length;
  while (markdownIndex < length) {
    let matched = false;
    for (const pattern of patterns) {
      const substring = markdown.substring(markdownIndex);
      const match = substring.match(pattern.regex);
      if (match) {
        const matchText = match[0];
        const matchLength =
          typeof pattern.length === "function"
            ? pattern.length(matchText)
            : pattern.length;
        if (pattern.type === "html-entity") {
          const transformed = pattern.transform!(matchText);
          plainText += transformed;
          for (let i = 0; i < transformed.length; i++) {
            mapping[plainIndex++] = markdownIndex + matchLength - 1;
          }
        } else if (pattern.type === "link") {
          const linkText = pattern.extract ? pattern.extract(matchText) : "";
          if (matchText.includes("resource=")) {
            plainText += "⬡ ";
            mapping[plainIndex++] = markdownIndex + 1;
            mapping[plainIndex++] = markdownIndex + 2;
          }
          for (let i = 0; i < linkText.length; i++) {
            plainText += linkText[i];
            mapping[plainIndex++] = markdownIndex + 1 + i;
          }
        } else if (pattern.type === "newline") {
          plainText += "\n";
          mapping[plainIndex++] = markdownIndex;
        } else if (pattern.type === "any-other") {
          plainText += matchText;
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

/** Resolve markdown offset for shared inline Markdown presentation. */
function resolveMarkdownOffset(plainOffset: number, mapping: number[]): number {
  if (!mapping.length) return 0;
  if (plainOffset < 0) return 0;
  if (plainOffset >= mapping.length)
    return mapping[mapping.length - 1] + 1 || 0;
  return mapping[plainOffset];
}

/** Resolve plain offset for md end for shared inline Markdown presentation. */
export function resolvePlainOffsetForMdEnd(markdown: string) {
  const { plainText } = createPositionMapping(markdown);
  return plainText.length;
}

/** Split markdown at plain offset for shared inline Markdown presentation. */
export function splitMarkdownAtPlainOffset(
  markdown: string,
  plainOffset: number
): {
  before: string;
  after: string;
} {
  if (!markdown) return { before: "", after: "" };
  const { plainText, mapping } = createPositionMapping(markdown);
  plainOffset = Math.max(0, Math.min(plainText.length, plainOffset));
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

import React, { useMemo } from "react";
import { marked } from "marked";

// Markdown as it arrives in a Claude Code transcript. The elements it produces
// are styled by the `.markdown` block in .radix/style.css, in the same way a
// workspace's own plain HTML is styled by `.page`.

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A message can carry anything the agent read off a web page, so two things
// are held back: raw HTML is shown as the text it is rather than becoming live
// markup, and a link has to point somewhere a browser can follow.
const FOLLOWABLE = /^(https?:|mailto:|#|\/)/i;

marked.use({
  gfm: true,
  renderer: {
    html: ({ text }) => escape(text),

    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!FOLLOWABLE.test(href)) return text;
      const label = title ? ` title="${escape(title)}"` : "";
      return `<a href="${escape(href)}"${label} target="_blank" rel="noreferrer">${text}</a>`;
    },
  },
});

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => marked.parse(text, { async: false }), [text]);

  return <div className={"markdown " + className} dangerouslySetInnerHTML={{ __html: html }} />;
}

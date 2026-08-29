<script lang="ts">
  import MarkdownIt from "markdown-it";
  import { sanitizeMarkdownUrl } from "./markdown.utils";

  let {
    text = ""
  }: {
    text?: string;
  } = $props();

  const markdown = new MarkdownIt({
    html: false,
    linkify: true
  });

  const fallbackLinkOpenRenderer =
    markdown.renderer.rules.link_open ??
    ((tokens: any, index: number, options: any, _: any, self: any) =>
      self.renderToken(tokens, index, options));
  const fallbackLinkCloseRenderer =
    markdown.renderer.rules.link_close ??
    ((tokens: any, index: number, options: any, _: any, self: any) =>
      self.renderToken(tokens, index, options));

  markdown.validateLink = (url: string) => Boolean(sanitizeMarkdownUrl(url));
  markdown.normalizeLink = (url: string) => sanitizeMarkdownUrl(url) ?? url;
  markdown.renderer.rules.link_open = (
    tokens: any,
    index: number,
    options: any,
    env: any,
    self: any
  ) => {
    const hrefIndex = tokens[index].attrIndex("href");
    const href =
      hrefIndex >= 0 ? (tokens[index].attrs?.[hrefIndex]?.[1] ?? "") : "";
    const sanitizedHref = href ? sanitizeMarkdownUrl(href) : undefined;
    if (!sanitizedHref) {
      tokens[index].tag = "span";
      if (hrefIndex >= 0) tokens[index].attrs?.splice(hrefIndex, 1);
    } else {
      tokens[index].attrSet("href", sanitizedHref);
      tokens[index].attrSet("class", "text-aps1 hover:underline");
      const isExternal = sanitizedHref.startsWith("http");
      tokens[index].attrSet("target", isExternal ? "_blank" : "_self");
      if (isExternal) {
        tokens[index].attrSet("rel", "noopener noreferrer");
      }
    }
    return fallbackLinkOpenRenderer(tokens, index, options, env, self);
  };
  markdown.renderer.rules.link_close = (
    tokens: any,
    index: number,
    options: any,
    env: any,
    self: any
  ) => {
    if (tokens[index - 1]?.tag === "span") tokens[index].tag = "span";
    return fallbackLinkCloseRenderer(tokens, index, options, env, self);
  };

  const renderedText = $derived(markdown.render(text));

  function stopLinkPropagation(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("a")) {
        event.stopPropagation();
      }
    };
    node.addEventListener("click", handleClick);
    return {
      destroy() {
        node.removeEventListener("click", handleClick);
      }
    };
  }
</script>

<div class="markdown-renderer flex flex-col w-full" use:stopLinkPropagation>
  {@html renderedText}
</div>

<style>
  :global(.markdown-renderer strong) {
    font-weight: 600 !important;
  }
  :global(.markdown-renderer h1),
  :global(.markdown-renderer h2),
  :global(.markdown-renderer h3),
  :global(.markdown-renderer h4),
  :global(.markdown-renderer h5),
  :global(.markdown-renderer h6) {
    font-weight: 700 !important;
  }
  :global(.markdown-renderer a) {
    color: var(--color-aps1) !important;
    text-decoration: underline !important;
  }
  :global(.markdown-renderer ul) {
    list-style: none;
    padding-left: 1.25rem;
  }
  :global(.markdown-renderer li::before) {
    content: "\2022 ";
  }
</style>

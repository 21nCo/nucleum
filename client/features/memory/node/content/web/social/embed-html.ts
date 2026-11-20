import DOMPurify from "dompurify";

const EMBED_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

/**
 * Returns the URL when it is an absolute https URL on another origin than the
 * app. Embedded frames on the app origin would run with the user's session, so
 * they are refused.
 */
export function resolveEmbedFrameUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (
      typeof window !== "undefined" &&
      url.origin === window.location.origin
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Returns the URL when it is an absolute http(s) URL, for links inside embed HTML. */
function resolveEmbedLinkUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value, "https://invalid.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hostname === "invalid.invalid") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitises third-party embed HTML (oEmbed responses, post bodies) before it is
 * rendered with `{@html}`. Scripts, event handlers, forms, styles that load
 * resources and non-http(s) URLs are removed; frames must be https on another
 * origin and are sandboxed; links open in a new tab without an opener.
 */
export function sanitizeEmbedHtml(html: unknown): string {
  if (typeof html !== "string" || html.length === 0) return "";
  const purifier = DOMPurify();
  purifier.addHook("afterSanitizeAttributes", (node) => {
    const element = node as Element;
    const tagName = element.tagName?.toLowerCase();
    if (tagName === "iframe") {
      const src = resolveEmbedFrameUrl(element.getAttribute("src"));
      if (!src) {
        element.parentNode?.removeChild(element);
        return;
      }
      element.setAttribute("src", src);
      element.setAttribute("sandbox", EMBED_IFRAME_SANDBOX);
    }
    if (tagName === "a") {
      const href = resolveEmbedLinkUrl(element.getAttribute("href"));
      if (href) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("href");
        element.removeAttribute("target");
      }
    }
    if (tagName === "img" || tagName === "video" || tagName === "source") {
      const src = element.getAttribute("src");
      if (src && !resolveEmbedLinkUrl(src)) element.removeAttribute("src");
    }
  });
  return purifier.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "target", "loading"],
    FORBID_TAGS: [
      "style",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "object",
      "embed",
      "base",
      "meta",
      "link"
    ],
    FORBID_ATTR: ["srcdoc", "formaction", "action"],
    ALLOWED_URI_REGEXP: /^https?:/i
  });
}

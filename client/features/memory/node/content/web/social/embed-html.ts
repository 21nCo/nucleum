import DOMPurify from "dompurify";

import { isAbsoluteHttpUrl } from "@21n/shared-utils/url.utils";

/** Sandbox applied to every third-party embed frame. */
export const EMBED_IFRAME_SANDBOX =
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

const HTML_ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Escapes a value for use inside a quoted HTML attribute in a built embed snippet. */
export function escapeHtmlAttribute(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => HTML_ATTRIBUTE_ESCAPES[char] ?? char
  );
}

/** Attributes that hold a URL; outside links and frames they must be absolute http(s). */
const URI_ATTRIBUTES = [
  "href",
  "src",
  "xlink:href",
  "poster",
  "background",
  "cite",
  "longdesc",
  "data",
  "action",
  "formaction"
];

/**
 * Sanitises third-party embed HTML (oEmbed responses, post bodies) before it is
 * rendered with `{@html}`. Scripts, event handlers, forms, `<style>` elements,
 * inline `style` attributes (except on frames, or replaced by
 * `options.elementStyle`), `srcset` and every URL attribute that is not an
 * absolute http(s) URL are removed; frames must be https on another origin and are sandboxed;
 * links open in a new tab without an opener. Callers render the result inside
 * a `contain: paint` wrapper so class-based positioning cannot cover the app.
 */
export function sanitizeEmbedHtml(
  html: unknown,
  options: { elementStyle?: string } = {}
): string {
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
      const href = element.getAttribute("href");
      if (isAbsoluteHttpUrl(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("href");
        element.removeAttribute("target");
      }
    }
    for (const name of URI_ATTRIBUTES) {
      if (tagName === "a" && name === "href") continue;
      if (tagName === "iframe" && name === "src") continue;
      const value = element.getAttribute(name);
      if (value !== null && !isAbsoluteHttpUrl(value)) element.removeAttribute(name);
    }
    element.removeAttribute("srcset");
    if (tagName !== "iframe") {
      if (options.elementStyle) element.setAttribute("style", options.elementStyle);
      else element.removeAttribute("style");
    }
  });
  return purifier.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "target", "loading"],
    FORBID_ATTR: ["srcdoc", "formaction", "action"],
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
    ]
  });
}

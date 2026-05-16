import { isValidEmail } from "@21n/shared-utils/text.utils";

export function extractProductv1(host: string) {
  if (!host) return { product: "", env: "" };
  const domain = host.split(/\.com|\.org|\.io|\.run/)[0];
  const parts = domain.split(".");
  const product = parts[parts.length - 1];
  const subdomain = parts[parts.length - 2];
  const env = resolveEnvv1(subdomain);
  return { product, env };
}

function resolveEnvv1(subdomain: string) {
  if (!subdomain || subdomain.includes("landing")) {
    return "landing";
  } else if (subdomain.includes("dev")) {
    return "dev";
  } else if (subdomain.includes("pre")) {
    return "pre";
  } else if (
    subdomain === "app" ||
    subdomain === "embed" ||
    subdomain === "ios" ||
    subdomain === "android" ||
    subdomain === "web" ||
    subdomain === "www" ||
    subdomain === "desktop"
  ) {
    return "live";
  } else {
    return "landing";
  }
}

export function extractProduct(host: string) {
  if (!host) return { product: "", env: "" };

  const simpleDomainMatch = host.match(/^([^.]+)\.(com|io|org|run|app|to)$/);
  if (simpleDomainMatch) {
    return {
      product: simpleDomainMatch[1],
      env: "landing"
    };
  }

  const blankFormatMatch = host.match(
    /^([^.]+)\.(tidigit|blank|21n)\.(dev|xyz|run|live|io|com)$/
  );
  if (blankFormatMatch) {
    return {
      product: blankFormatMatch[1],
      env: resolveEnv(blankFormatMatch[3])
    };
  }

  const straightFormatMatch = host.match(
    /^(.+)\.([^.]+)\.(com|io|org|run|app|xyz|to)$/
  );
  if (straightFormatMatch) {
    return {
      env: resolveEnv(straightFormatMatch[1]),
      product: straightFormatMatch[2]
    };
  }

  return { product: "", env: "" };

  function resolveEnv(slug: string) {
    if (slug.includes("dev")) {
      return "dev";
    } else if (slug.includes("pre") || slug === "xyz") {
      return "pre";
    } else if (
      slug === "app" ||
      slug === "alpha" ||
      slug === "embed" ||
      slug === "ios" ||
      slug === "android" ||
      slug === "web" ||
      slug === "www" ||
      slug === "desktop" ||
      slug === "live" ||
      slug === "io"
    ) {
      return "live";
    } else if (slug === "local" || slug === "localhost") {
      return "local";
    } else {
      return "landing";
    }
  }
}

export function generateUID() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export function isValidUrl(url: any): boolean {
  if (url === undefined || url === null) {
    return false;
  }

  try {
    const urlObj = new URL(String(url));
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }
    const hostname = urlObj.hostname;
    if (!hostname || hostname.endsWith(".") || !hostname.includes(".")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isUrlMatchPattern(url: string) {
  if (!url || /\s/.test(url)) return false;

  try {
    const value = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname;
    return Boolean(
      hostname && !hostname.endsWith(".") && hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export function isValidHyperlink(url: string) {
  const isUrl = isValidUrl(url);
  const isEmail = isValidEmail(url);
  return isUrl || isEmail;
}

export function compareVersions(v1: string, v2: string) {
  const parseVersion = (v: string) => v.split(".").map(Number);
  const [major1, minor1, patch1, build1] = parseVersion(v1);
  const [major2, minor2, patch2, build2] = parseVersion(v2);

  if (major1 !== major2) return major1 > major2 ? 1 : -1;
  if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
  if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;
  if (build1 !== build2) return build1 > build2 ? 1 : -1;
  return 0;
}

type SanitizedEmbed = {
  embed: string;
  isGist?: boolean;
};

export function sanitize(text: string): string | SanitizedEmbed {
  const trustedScriptEmbed = parseTrustedScriptEmbed(text);
  if (trustedScriptEmbed) {
    return trustedScriptEmbed;
  }

  const mediaEmbed = parseAllowedMediaEmbed(text);
  if (mediaEmbed) {
    return mediaEmbed;
  }

  return stripHtmlTags(text);
}

function parseTrustedScriptEmbed(text: string) {
  const src = extractSingleScriptSrc(text);
  if (!src) return null;

  try {
    const url = new URL(src);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const fileName = pathParts[pathParts.length - 1] ?? "";
    if (url.protocol !== "https:") return null;

    if (
      url.hostname === "gist.github.com" &&
      pathParts.length >= 2 &&
      fileName.endsWith(".js")
    ) {
      const gistId = fileName.slice(0, -3);
      const user = pathParts[pathParts.length - 2];
      if (!gistId || !user) return null;
      return {
        embed: `https://gist.github.com/${user}/${gistId}`,
        isGist: true
      };
    }

    if (
      url.hostname === "gitlab.com" &&
      pathParts.length === 3 &&
      pathParts[0] === "-" &&
      pathParts[1] === "snippets" &&
      fileName.endsWith(".js")
    ) {
      const snippetId = fileName.slice(0, -3);
      if (!snippetId || !isAsciiDigits(snippetId)) return null;
      return {
        embed: `https://gitlab.com/-/snippets/${snippetId}`,
        isGist: true
      };
    }
  } catch {
    return null;
  }

  return null;
}

function extractSingleScriptSrc(text: string) {
  const trimmed = text.trim();
  const openTag = readOpeningTag(trimmed);
  if (!openTag || openTag.tagName !== "script") return null;
  if (!hasOnlyMatchingCloseTag(trimmed, openTag.openTagEnd, "script")) {
    return null;
  }
  return readAttributeValue(openTag.tag, "src");
}

function parseAllowedMediaEmbed(text: string) {
  const trimmed = text.trim();
  const allowedTags = new Set(["iframe", "video", "audio", "object", "embed"]);
  const openTag = readOpeningTag(trimmed);
  if (!openTag) return null;

  if (!allowedTags.has(openTag.tagName)) return null;
  if (
    !hasOnlyMatchingCloseTag(trimmed, openTag.openTagEnd, openTag.tagName, {
      allowEmptyTrailingContent: true
    })
  ) {
    return null;
  }

  const src = readAttributeValue(openTag.tag, "src");
  if (!src) return null;

  try {
    const parsedUrl = new URL(src);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL");
    }
    return { embed: parsedUrl.toString() };
  } catch {
    throw new Error("Invalid URL");
  }
}

function readOpeningTag(text: string) {
  if (!text.startsWith("<") || text.startsWith("</") || text.startsWith("<!")) {
    return null;
  }

  const openTagEnd = text.indexOf(">");
  if (openTagEnd < 0) return null;

  const tagEnd = findTagNameEnd(text);
  if (tagEnd <= 1 || tagEnd > openTagEnd) return null;

  const tagName = text.slice(1, tagEnd).toLowerCase();
  return {
    tag: text.slice(0, openTagEnd + 1),
    tagName,
    openTagEnd
  };
}

function hasOnlyMatchingCloseTag(
  text: string,
  openTagEnd: number,
  tagName: string,
  options: { allowEmptyTrailingContent?: boolean } = {}
) {
  const openTag = text.slice(0, openTagEnd + 1).trimEnd();
  const trailingContent = text.slice(openTagEnd + 1).trim();
  if (openTag.endsWith("/>")) return trailingContent === "";
  if (options.allowEmptyTrailingContent && trailingContent === "") return true;

  return trailingContent.toLowerCase() === `</${tagName}>`;
}

function stripHtmlTags(text: string) {
  let output = "";
  let insideTag = false;

  for (const char of text) {
    if (char === "<") {
      insideTag = true;
      continue;
    }
    if (char === ">") {
      insideTag = false;
      continue;
    }
    if (!insideTag) {
      output += char;
    }
  }

  return output;
}

function readAttributeValue(tag: string, attributeName: string) {
  let index = 0;
  const lowerTag = tag.toLowerCase();
  const attribute = attributeName.toLowerCase();

  while (index < tag.length) {
    const found = lowerTag.indexOf(attribute, index);
    if (found < 0) return null;

    const before = found === 0 ? "" : lowerTag[found - 1];
    const after = lowerTag[found + attribute.length] ?? "";
    const hasNameBoundary = !before || /\s/.test(before);
    if (!hasNameBoundary || after !== "=") {
      index = found + attribute.length;
      continue;
    }

    let valueStart = found + attribute.length + 1;
    const quote = tag[valueStart];
    if (quote !== '"' && quote !== "'") return null;
    valueStart += 1;
    const valueEnd = tag.indexOf(quote, valueStart);
    return valueEnd < 0 ? null : tag.slice(valueStart, valueEnd);
  }

  return null;
}

function findTagNameEnd(text: string) {
  let index = 1;
  while (index < text.length) {
    const char = text[index];
    if (char === ">" || /\s/.test(char) || char === "/") break;
    index += 1;
  }
  return index;
}

function isAsciiDigits(value: string) {
  for (const char of value) {
    if (char < "0" || char > "9") return false;
  }
  return true;
}

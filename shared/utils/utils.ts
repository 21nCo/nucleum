import { isValidEmail } from "./text.utils";

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
    /^(.+)\.([^.]+)\.(com|io|org|run|app|xyz)$/
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
  const urlPattern = new RegExp(
    "^" +
      "(?:(?:https?:)?\\/\\/)?" +
      "(?:" +
      "(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
      "|" +
      "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
      "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
      "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
      ")" +
      "(?::\\d{2,5})?" +
      "(?:[/?#]\\S*)?" +
      "$",
    "i"
  );
  return urlPattern.test(url);
}

export function isValidHyperlink(url: string) {
  const isUrl = isValidUrl(url);
  const isEmail = isValidEmail(url);
  return isUrl || isEmail;
}

export function compareVersions(v1: string, v2: string) {
  const parseVersion = (v: string) => v.split(".").map(Number);
  const [major1, minor1, patch1] = parseVersion(v1);
  const [major2, minor2, patch2] = parseVersion(v2);

  if (major1 !== major2) return major1 > major2 ? 1 : -1;
  if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
  if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;
  return 0;
}

export function sanitize(text: string) {
  const gistMatch = text.match(
    /<script src="https:\/\/gist\.github\.com\/([^\/]+)\/([^"]+)\.js"><\/script>/
  );
  if (gistMatch) {
    return {
      embed: `https://gist.github.com/${gistMatch[1]}/${gistMatch[2]}`,
      isGist: true
    };
  }

  const gitlabMatch = text.match(
    /<script src="https:\/\/gitlab\.com\/-\/snippets\/(\d+)\.js"><\/script>/
  );
  if (gitlabMatch) {
    return {
      embed: `https://gitlab.com/-/snippets/${gitlabMatch[1]}`,
      isGist: true
    };
  }

  const sanitizedText = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/data:/gi, "");

  if (
    sanitizedText.startsWith("<iframe") ||
    sanitizedText.startsWith("<video") ||
    sanitizedText.startsWith("<audio") ||
    sanitizedText.startsWith("<object") ||
    sanitizedText.startsWith("<embed")
  ) {
    const url = sanitizedText.match(/src="([^"]+)"/)?.[1];
    if (url) {
      try {
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid URL");
        }
        return { embed: url };
      } catch {
        throw new Error("Invalid URL");
      }
    }
  }

  return sanitizedText.replace(/<[^>]*>/g, "");
}

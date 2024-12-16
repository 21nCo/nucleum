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

  const simpleDomainMatch = host.match(/^([^.]+)\.(com|io|org|run)$/);
  if (simpleDomainMatch) {
    return {
      product: simpleDomainMatch[1],
      env: "landing"
    };
  }

  const blankFormatMatch = host.match(
    /^([^.]+)\.(tidigit|blank|21n)\.(dev|xyz|run|live)$/
  );
  if (blankFormatMatch) {
    return {
      product: blankFormatMatch[1],
      env: resolveEnv(blankFormatMatch[3])
    };
  }

  const straightFormatMatch = host.match(/^(.+)\.([^.]+)\.(com|io|org|run)$/);
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
      slug === "live"
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

export function isValidUrl(url: string) {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" +
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
      "((\\d{1,3}\\.){3}\\d{1,3}))" +
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
      "(\\?[;&a-z\\d%_.~+=-]*)?" +
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return urlPattern.test(url);
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

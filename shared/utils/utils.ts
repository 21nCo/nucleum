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
    /^([^.]+)\.(tidigit|blank)\.(dev|xyz|run|live)$/
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

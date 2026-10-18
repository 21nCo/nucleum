/** Parses a product and environment from a host name. */
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

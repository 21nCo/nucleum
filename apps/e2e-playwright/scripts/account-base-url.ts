const DEV_HOST_ZONE_PATTERN = /^(nucleum|memotron|pointron)\.21n\.dev$/;
const ENV_SUBDOMAINS = new Set(["local", "dev", "pre", "web", "app"]);

/**
 * Resolves the account service origin that owns the browser session for an
 * app origin, or null for loopback hosts. Deployed dev web hosts
 * (`<product>.21n.dev`, known products only) map to
 * `<product>-account-<region>.21n.dev`; other hosts use the
 * `account-<region>[-<env>].<domain>` layout. Used by the auth-state scripts.
 */
export function resolveAccountBaseUrl(appBaseUrl: string, region = "insouth") {
  const host = new URL(appBaseUrl).hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return null;
  }
  const devZoneMatch = DEV_HOST_ZONE_PATTERN.exec(host);
  if (devZoneMatch) {
    return `https://${devZoneMatch[1]}-account-${region}.21n.dev`;
  }
  const labels = host.split(".").filter(Boolean);
  const subdomain = labels[0] ?? "";
  let env = "dev";
  if (subdomain === "local" || subdomain === "dev" || subdomain === "pre") {
    env = subdomain;
  } else if (subdomain === "web" || subdomain === "app") {
    env = "live";
  }
  const domain = ENV_SUBDOMAINS.has(subdomain)
    ? labels.slice(1).join(".")
    : labels.slice(-2).join(".");
  const envSuffix = env === "live" ? "" : `-${env}`;
  return `https://account-${region}${envSuffix}.${domain}`;
}

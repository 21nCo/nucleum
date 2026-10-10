import process from 'node:process';

/**
 * Resolves the Cloudflare zone ID for a route zone. Precedence:
 * `CLOUDFLARE_ZONE_ID_<ZONE>` env override, then the zone ID pinned in
 * environments.json (`hosts.zoneId`, which avoids ambiguous name lookups when
 * the same zone name exists in more than one account), then a lookup by name.
 */
export async function resolveZoneIdForRouteZone(zoneName, token, configuredZoneId) {
  const specificEnvName = `CLOUDFLARE_ZONE_ID_${zoneName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const specificZoneId = process.env[specificEnvName];
  if (specificZoneId) return specificZoneId;
  if (configuredZoneId) return configuredZoneId;
  return resolveZoneId(zoneName, token);
}

/** Looks up a zone ID by zone name with the given API token. */
export async function resolveZoneId(zoneName, token) {
  const zones = await cloudflare(`/zones?name=${encodeURIComponent(zoneName)}`, token);
  const zone = zones.find((entry) => entry.name === zoneName);
  if (!zone) {
    throw new Error(`Cloudflare zone not found: ${zoneName}`);
  }
  return zone.id;
}

/** Calls the Cloudflare v4 API and returns `result`, throwing with `cloudflareStatus` on failure. */
export async function cloudflare(pathname, token, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!payload.success) {
    const error = new Error(`Cloudflare API failed: ${JSON.stringify(payload.errors)}`);
    error.cloudflareStatus = response.status;
    throw error;
  }
  return payload.result;
}

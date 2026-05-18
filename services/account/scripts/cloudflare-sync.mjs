import fs from 'node:fs';
import path from 'node:path';

export function readAccountConfig(serviceRoot) {
  return JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));
}

export function normalizeEnvironment(value) {
  const normalized = value.trim().toLowerCase();
  if (['dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

export function groupByZoneName(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const zoneEntries = grouped.get(entry.zoneName) ?? [];
    zoneEntries.push(entry);
    grouped.set(entry.zoneName, zoneEntries);
  }
  return grouped;
}

export async function resolveZoneIdForRouteZone(config, zoneName, token) {
  const specificEnvName = `CLOUDFLARE_ZONE_ID_${zoneName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const specificZoneId = process.env[specificEnvName];
  if (specificZoneId) return specificZoneId;

  if (zoneName === config.accountDomain && process.env.CLOUDFLARE_ZONE_ID) {
    return process.env.CLOUDFLARE_ZONE_ID;
  }

  return resolveZoneId(zoneName, token);
}

export async function resolveZoneId(zoneName, token) {
  const zones = await cloudflare(`/zones?name=${encodeURIComponent(zoneName)}`, token);
  const zone = zones.find((entry) => entry.name === zoneName);
  if (!zone) {
    throw new Error(`Cloudflare zone not found: ${zoneName}`);
  }
  return zone.id;
}

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

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { routeDefinitions } from './wrangler-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const regionsArg = process.argv.find((arg) => arg.startsWith('--regions='))?.split('=')[1];
const regions = regionsArg ? regionsArg.split(',').map((entry) => entry.trim()).filter(Boolean) : Object.keys(config.regions);

if (!environment || !config.environments[environment]) {
  console.error('Usage: node scripts/sync-routes.mjs <dev|pre|live> [--regions=insouth,useast,euwest]');
  process.exit(1);
}

const token = process.env.CLOUDFLARE_ROUTES_TOKEN
  ?? process.env.CLOUDFLARE_USER_TOKEN
  ?? process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('Set CLOUDFLARE_ROUTES_TOKEN, CLOUDFLARE_USER_TOKEN, or CLOUDFLARE_API_TOKEN before syncing routes.');
  process.exit(1);
}

const routesByZone = groupRoutesByZone(routeDefinitions(config, environment, regions));

for (const [zoneName, routes] of routesByZone) {
  const zoneId = await resolveZoneIdForRouteZone(zoneName, token);
  const existingRoutes = await cloudflare(`/zones/${zoneId}/workers/routes`, token);
  const existingByPattern = new Map(existingRoutes.map((route) => [route.pattern, route]));

  for (const route of routes) {
    const existing = existingByPattern.get(route.pattern);
    if (!existing) {
      const created = await cloudflare(`/zones/${zoneId}/workers/routes`, token, {
        method: 'POST',
        body: {
          pattern: route.pattern,
          script: route.script
        }
      });
      console.log(`created ${created.pattern} -> ${created.script} (${zoneName})`);
      continue;
    }

    if (existing.script === route.script) {
      console.log(`ok ${existing.pattern} -> ${existing.script} (${zoneName})`);
      continue;
    }

    const updated = await cloudflare(`/zones/${zoneId}/workers/routes/${existing.id}`, token, {
      method: 'PUT',
      body: {
        pattern: route.pattern,
        script: route.script
      }
    });
    console.log(`updated ${updated.pattern} -> ${updated.script} (${zoneName})`);
  }
}

function groupRoutesByZone(routes) {
  const grouped = new Map();
  for (const route of routes) {
    const entries = grouped.get(route.zoneName) ?? [];
    entries.push(route);
    grouped.set(route.zoneName, entries);
  }
  return grouped;
}

async function resolveZoneIdForRouteZone(zoneName, token) {
  const specificEnvName = `CLOUDFLARE_ZONE_ID_${zoneName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const specificZoneId = process.env[specificEnvName];
  if (specificZoneId) return specificZoneId;

  if (zoneName === config.accountDomain && process.env.CLOUDFLARE_ZONE_ID) {
    return process.env.CLOUDFLARE_ZONE_ID;
  }

  return resolveZoneId(zoneName, token);
}

async function resolveZoneId(zoneName, token) {
  const zones = await cloudflare(`/zones?name=${encodeURIComponent(zoneName)}`, token);
  const zone = zones.find((entry) => entry.name === zoneName);
  if (!zone) {
    throw new Error(`Cloudflare zone not found: ${zoneName}`);
  }
  return zone.id;
}

async function cloudflare(pathname, token, options = {}) {
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
    throw new Error(`Cloudflare API failed: ${JSON.stringify(payload.errors)}`);
  }
  return payload.result;
}

function normalizeEnvironment(value) {
  const normalized = value.trim().toLowerCase();
  if (['dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

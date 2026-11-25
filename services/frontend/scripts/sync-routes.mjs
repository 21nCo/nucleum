import path from 'node:path';
import process from 'node:process';
import {
  getArgValue,
  normalizeEnvironment,
  parseProducts,
  readConfig,
  routeDefinitions
} from './frontend-config.mjs';
import { cloudflare, resolveZoneIdForRouteZone } from './cloudflare-sync.mjs';
import { syncZoneRoutes } from '../../../tools/cloudflare/sync-zone-routes.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = readConfig(serviceRoot);
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');

if (!environment) {
  console.error('Usage: node scripts/sync-routes.mjs <dev|pre|live> [--products=nucleum,memotron,pointron|all]');
  process.exit(1);
}

const products = parseProducts(config, getArgValue(process.argv, 'products') ?? 'all');
const token = process.env.CLOUDFLARE_ROUTES_TOKEN
  ?? process.env.CLOUDFLARE_USER_TOKEN
  ?? process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error('Set CLOUDFLARE_ROUTES_TOKEN, CLOUDFLARE_USER_TOKEN, or CLOUDFLARE_API_TOKEN before syncing frontend routes.');
  process.exit(1);
}

const routesByZone = groupRoutesByZone(routeDefinitions(config, environment, products));
const zoneIds = new Map();

for (const zoneName of routesByZone.keys()) {
  zoneIds.set(zoneName, await resolveZoneIdForRouteZone(zoneName, token, routesByZone.get(zoneName)[0]?.zoneId));
}

for (const [zoneName, routes] of routesByZone) {
  const zoneId = zoneIds.get(zoneName);
  await syncZoneRoutes({ zoneId, zoneName, routes, token, cloudflare });
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

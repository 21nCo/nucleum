import path from 'node:path';
import process from 'node:process';
import { routeDefinitions } from './wrangler-config.mjs';
import {
  cloudflare,
  groupByZoneName,
  normalizeEnvironment,
  readAccountConfig,
  resolveZoneIdForRouteZone
} from './cloudflare-sync.mjs';
import { syncZoneRoutes } from '../../../tools/cloudflare/sync-zone-routes.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = readAccountConfig(serviceRoot);
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

const routesByZone = groupByZoneName(routeDefinitions(config, environment, regions));

for (const [zoneName, routes] of routesByZone) {
  const zoneId = await resolveZoneIdForRouteZone(config, zoneName, token, routes[0]?.zoneId);
  await syncZoneRoutes({ zoneId, zoneName, routes, token, cloudflare });
}

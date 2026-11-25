import path from 'node:path';
import process from 'node:process';
import {
  getArgValue,
  hasFlag,
  normalizeEnvironment,
  parseProducts,
  readConfig,
  wafExceptionDefinitions
} from './frontend-config.mjs';
import { cloudflare, resolveZoneIdForRouteZone } from './cloudflare-sync.mjs';
import { printWafExceptionPreview, syncWafExceptions } from '../../../tools/cloudflare/sync-waf-exceptions.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = readConfig(serviceRoot);
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');

if (!environment) {
  console.error('Usage: node scripts/sync-waf-exceptions.mjs <dev|pre|live> [--products=nucleum,memotron,pointron|all] [--dry-run]');
  process.exit(1);
}

const products = parseProducts(config, getArgValue(process.argv, 'products') ?? 'all');
const dryRun = hasFlag(process.argv, 'dry-run');
const exceptionsByZone = groupExceptionsByZone(wafExceptionDefinitions(config, environment, products));
const token = process.env.CLOUDFLARE_WAF_TOKEN
  ?? process.env.CLOUDFLARE_ROUTES_TOKEN
  ?? process.env.CLOUDFLARE_USER_TOKEN
  ?? process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  if (dryRun) {
    printWafExceptionPreview(exceptionsByZone);
    process.exit(0);
  }

  console.error('Set CLOUDFLARE_WAF_TOKEN, CLOUDFLARE_ROUTES_TOKEN, CLOUDFLARE_USER_TOKEN, or CLOUDFLARE_API_TOKEN before syncing frontend WAF exceptions.');
  process.exit(1);
}

await syncWafExceptions({
  exceptionsByZone,
  dryRun,
  token,
  cloudflare,
  resolveZoneId: resolveZoneIdForRouteZone
});

function groupExceptionsByZone(exceptions) {
  const grouped = new Map();
  for (const exception of exceptions) {
    const entries = grouped.get(exception.zoneName) ?? [];
    entries.push(exception);
    grouped.set(exception.zoneName, entries);
  }
  return grouped;
}

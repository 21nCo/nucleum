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
import { syncWafExceptions } from '../../../tools/cloudflare/sync-waf-exceptions.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = readAccountConfig(serviceRoot);
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const regionsArg = process.argv.find((arg) => arg.startsWith('--regions='))?.split('=')[1];
const regions = regionsArg ? regionsArg.split(',').map((entry) => entry.trim()).filter(Boolean) : Object.keys(config.regions);
const productsArg = process.argv.find((arg) => arg.startsWith('--products='))?.split('=')[1];
const productDomains = parseProductDomains(config, productsArg ?? 'all');
const dryRun = process.argv.includes('--dry-run');

if (!environment || !config.environments[environment]) {
  console.error('Usage: node scripts/sync-waf-exceptions.mjs <dev|pre|live> [--regions=insouth,useast,euwest] [--products=nucleum,memotron,pointron|all] [--dry-run]');
  process.exit(1);
}

const token = process.env.CLOUDFLARE_WAF_TOKEN
  ?? process.env.CLOUDFLARE_ROUTES_TOKEN
  ?? process.env.CLOUDFLARE_USER_TOKEN
  ?? process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  if (dryRun) {
    for (const [zoneName, exceptions] of groupByZoneName(wafExceptionDefinitions(config, environment, regions, productDomains))) {
      console.log(`dry-run ${zoneName}`);
      for (const exception of exceptions) {
        console.log(JSON.stringify(exception.rule, null, 2));
      }
    }
    process.exit(0);
  }

  console.error('Set CLOUDFLARE_WAF_TOKEN, CLOUDFLARE_ROUTES_TOKEN, CLOUDFLARE_USER_TOKEN, or CLOUDFLARE_API_TOKEN before syncing account WAF exceptions.');
  process.exit(1);
}

const exceptionsByZone = groupByZoneName(wafExceptionDefinitions(config, environment, regions, productDomains));

await syncWafExceptions({
  exceptionsByZone,
  dryRun,
  token,
  cloudflare,
  resolveZoneId: (zoneName, token, zoneId) => resolveZoneIdForRouteZone(config, zoneName, token, zoneId)
});

function wafExceptionDefinitions(config, environment, regions, productDomains) {
  const browserAuthRoutes = config.waf?.browserAuthRoutes;
  if (!browserAuthRoutes?.pathPrefix || !browserAuthRoutes?.rules) {
    throw new Error('Missing account browser auth route WAF exception config.');
  }

  return routeDefinitions(config, environment, regions).filter((route) => productDomains.has(route.productDomain)).map((route) => {
    const host = route.pattern.replace(/\/\*$/, '');
    return {
      zoneName: route.zoneName,
      zoneId: route.zoneId,
      rule: {
        ref: `21n_account_oauth_callback_${environment}_${route.script.replaceAll('-', '_')}_${route.productDomain.replace(/[^a-zA-Z0-9]+/g, '_')}`,
        description: `21n account browser auth route WAF exception: ${environment}/${host}`,
        expression: [
          `http.host eq ${quoteCloudflareString(host)}`,
          `starts_with(http.request.uri.path, ${quoteCloudflareString(browserAuthRoutes.pathPrefix)})`,
          `http.request.method in ${cloudflareStringSet(browserAuthRoutes.methods ?? ['GET', 'POST', 'OPTIONS'])}`
        ].join(' and '),
        action: 'skip',
        action_parameters: {
          rules: browserAuthRoutes.rules
        },
        logging: {
          enabled: true
        },
        enabled: true
      }
    };
  });
}

function parseProductDomains(config, value) {
  if (!value || value === 'all') {
    return new Set(Object.values(config.productDomains ?? { default: config.accountDomain }).filter(Boolean));
  }

  const products = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const domains = new Set();
  for (const product of products) {
    const domain = config.productDomains?.[product];
    if (!domain) {
      throw new Error(`Unknown account product: ${product}`);
    }
    domains.add(domain);
  }
  return domains;
}

function cloudflareStringSet(values) {
  return `{${values.map(quoteCloudflareString).join(' ')}}`;
}

function quoteCloudflareString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

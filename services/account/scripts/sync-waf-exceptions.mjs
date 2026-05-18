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

const managedFirewallPhase = 'http_request_firewall_managed';
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

for (const [zoneName, exceptions] of exceptionsByZone) {
  const zoneId = await resolveZoneIdForRouteZone(config, zoneName, token);
  const entrypoint = await readManagedRulesEntrypoint(zoneId, token);
  if (!entrypoint) {
    throw new Error(`Cloudflare managed WAF entrypoint not found for ${zoneName}. Enable the managed ruleset first, then sync exceptions.`);
  }

  const nextRules = upsertExceptionRules(entrypoint.rules ?? [], exceptions.map((exception) => exception.rule));
  const changed = JSON.stringify(nextRules) !== JSON.stringify((entrypoint.rules ?? []).map(toWritableRule));

  if (!changed) {
    console.log(`ok WAF exceptions for ${zoneName}`);
    continue;
  }

  if (dryRun) {
    console.log(`would update WAF exceptions for ${zoneName}`);
    for (const exception of exceptions) {
      console.log(`${exception.rule.ref}: ${exception.rule.expression}`);
    }
    continue;
  }

  await cloudflare(`/zones/${zoneId}/rulesets/phases/${managedFirewallPhase}/entrypoint`, token, {
    method: 'PUT',
    body: removeUndefinedValues({
      description: entrypoint.description,
      rules: nextRules
    })
  });
  console.log(`updated WAF exceptions for ${zoneName}`);
}

function wafExceptionDefinitions(config, environment, regions, productDomains) {
  const browserAuthRoutes = config.waf?.browserAuthRoutes;
  if (!browserAuthRoutes?.pathPrefix || !browserAuthRoutes?.rules) {
    throw new Error('Missing account browser auth route WAF exception config.');
  }

  return routeDefinitions(config, environment, regions).filter((route) => productDomains.has(route.zoneName)).map((route) => {
    const host = route.pattern.replace(/\/\*$/, '');
    return {
      zoneName: route.zoneName,
      rule: {
        ref: `21n_account_oauth_callback_${environment}_${route.script.replaceAll('-', '_')}_${route.zoneName.replace(/[^a-zA-Z0-9]+/g, '_')}`,
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

async function readManagedRulesEntrypoint(zoneId, token) {
  try {
    return await cloudflare(`/zones/${zoneId}/rulesets/phases/${managedFirewallPhase}/entrypoint`, token);
  } catch (error) {
    if (error.cloudflareStatus === 404) return null;
    throw error;
  }
}

function upsertExceptionRules(existingRules, exceptionRules) {
  const existingWritableRules = existingRules.map(toWritableRule);
  const exceptionRefs = new Set(exceptionRules.map((rule) => rule.ref));
  const existingExceptionsByRef = new Map(
    existingWritableRules.filter((rule) => exceptionRefs.has(rule.ref)).map((rule) => [rule.ref, rule])
  );
  const nextExceptionRules = exceptionRules.map((rule) => toWritableRule({
    id: existingExceptionsByRef.get(rule.ref)?.id,
    ...rule
  }));
  const withoutExistingExceptions = existingWritableRules.filter((rule) => !exceptionRefs.has(rule.ref));
  const firstExecuteIndex = withoutExistingExceptions.findIndex((rule) => rule.action === 'execute');
  if (firstExecuteIndex < 0) {
    throw new Error('Cloudflare managed WAF entrypoint has no managed rules execute rule to place exceptions before.');
  }

  return [
    ...withoutExistingExceptions.slice(0, firstExecuteIndex),
    ...nextExceptionRules,
    ...withoutExistingExceptions.slice(firstExecuteIndex)
  ];
}

function toWritableRule(rule) {
  return removeUndefinedValues({
    id: rule.id,
    ref: rule.ref,
    description: rule.description,
    expression: rule.expression,
    action: rule.action,
    action_parameters: rule.action_parameters,
    enabled: rule.enabled,
    logging: rule.logging,
    categories: rule.categories,
    exposed_credential_check: rule.exposed_credential_check,
    ratelimit: rule.ratelimit
  });
}

function removeUndefinedValues(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}

function cloudflareStringSet(values) {
  return `{${values.map(quoteCloudflareString).join(' ')}}`;
}

function quoteCloudflareString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

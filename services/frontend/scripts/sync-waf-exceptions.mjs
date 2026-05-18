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

const managedFirewallPhase = 'http_request_firewall_managed';
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
    for (const [zoneName, exceptions] of exceptionsByZone) {
      console.log(`dry-run ${zoneName}`);
      for (const exception of exceptions) {
        console.log(JSON.stringify(exception.rule, null, 2));
      }
    }
    process.exit(0);
  }

  console.error('Set CLOUDFLARE_WAF_TOKEN, CLOUDFLARE_ROUTES_TOKEN, CLOUDFLARE_USER_TOKEN, or CLOUDFLARE_API_TOKEN before syncing frontend WAF exceptions.');
  process.exit(1);
}

for (const [zoneName, exceptions] of exceptionsByZone) {
  const zoneId = await resolveZoneIdForRouteZone(zoneName, token);
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

function groupExceptionsByZone(exceptions) {
  const grouped = new Map();
  for (const exception of exceptions) {
    const entries = grouped.get(exception.zoneName) ?? [];
    entries.push(exception);
    grouped.set(exception.zoneName, entries);
  }
  return grouped;
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

async function resolveZoneIdForRouteZone(zoneName, token) {
  const specificEnvName = `CLOUDFLARE_ZONE_ID_${zoneName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const specificZoneId = process.env[specificEnvName];
  if (specificZoneId) return specificZoneId;
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
    const error = new Error(`Cloudflare API failed: ${JSON.stringify(payload.errors)}`);
    error.cloudflareStatus = response.status;
    throw error;
  }
  return payload.result;
}

import { isDeepStrictEqual } from 'node:util';

const managedFirewallPhase = 'http_request_firewall_managed';

/** Applies each zone's managed WAF exception plan or prints its changes in dry-run mode. */
export async function syncWafExceptions({ exceptionsByZone, dryRun, token, cloudflare, resolveZoneId }) {
  for (const [zoneName, exceptions] of exceptionsByZone) {
    const zoneId = await resolveZoneId(zoneName, token, exceptions[0]?.zoneId);
    const entrypoint = await readManagedRulesEntrypoint(zoneId, token, cloudflare);
    if (!entrypoint) {
      throw new Error(`Cloudflare managed WAF entrypoint not found for ${zoneName}. Enable the managed ruleset first, then sync exceptions.`);
    }

    const currentRules = (entrypoint.rules ?? []).map(toWritableRule);
    const nextRules = upsertExceptionRules(currentRules, exceptions.map((exception) => exception.rule));
    const changed = !isDeepStrictEqual(nextRules, currentRules);

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
}

async function readManagedRulesEntrypoint(zoneId, token, cloudflare) {
  try {
    return await cloudflare(`/zones/${zoneId}/rulesets/phases/${managedFirewallPhase}/entrypoint`, token);
  } catch (error) {
    if (error.cloudflareStatus === 404) return null;
    throw error;
  }
}

/** Preserves rules already ahead of the managed rules and inserts missing or late exceptions. */
function upsertExceptionRules(existingRules, exceptionRules) {
  const desiredByRef = new Map();
  for (const rule of exceptionRules) {
    const desired = toWritableRule(rule);
    const previous = desiredByRef.get(desired.ref);
    if (previous && !isDeepStrictEqual(previous, desired)) {
      throw new Error(`Conflicting WAF exception definitions for ${desired.ref}`);
    }
    desiredByRef.set(desired.ref, desired);
  }

  const firstExecuteIndex = existingRules.findIndex((rule) =>
    rule.action === 'execute' && !desiredByRef.has(rule.ref)
  );
  if (firstExecuteIndex < 0) {
    throw new Error('Cloudflare managed WAF entrypoint has no managed rules execute rule to place exceptions before.');
  }

  const pending = new Map(desiredByRef);
  const beforeExecute = existingRules.slice(0, firstExecuteIndex).map((rule) => {
    const desired = pending.get(rule.ref);
    if (!desired) return rule;
    pending.delete(rule.ref);
    return toWritableRule({ id: rule.id, ...desired });
  });
  const existingByRef = new Map(existingRules.map((rule) => [rule.ref, rule]));
  const insertions = Array.from(pending.values(), (rule) =>
    toWritableRule({ id: existingByRef.get(rule.ref)?.id, ...rule })
  );
  return [
    ...beforeExecute,
    ...insertions,
    ...existingRules.slice(firstExecuteIndex).filter((rule) => !desiredByRef.has(rule.ref))
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

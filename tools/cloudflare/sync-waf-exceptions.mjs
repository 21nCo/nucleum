const managedFirewallPhase = 'http_request_firewall_managed';

/** Applies each zone's managed WAF exception plan or prints its changes in dry-run mode. */
export async function syncWafExceptions({ exceptionsByZone, dryRun, token, cloudflare, resolveZoneId }) {
  for (const [zoneName, exceptions] of exceptionsByZone) {
    const zoneId = await resolveZoneId(zoneName, token, exceptions[0]?.zoneId);
    const entrypoint = await readManagedRulesEntrypoint(zoneId, token, cloudflare);
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
}

async function readManagedRulesEntrypoint(zoneId, token, cloudflare) {
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

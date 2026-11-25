/** Reconciles the specified Worker routes in one Cloudflare zone. */
export async function syncZoneRoutes({ zoneId, zoneName, routes, token, cloudflare }) {
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

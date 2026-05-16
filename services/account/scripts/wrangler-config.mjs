import fs from 'node:fs';
import path from 'node:path';

export function renderWranglerConfig(serviceRoot, config, environment, options = {}) {
  const includeRoutes = options.includeRoutes === true;
  const outputDir = path.join(serviceRoot, '.wrangler');
  fs.mkdirSync(outputDir, { recursive: true });
  const generatedConfig = {
    ...config,
    main: toPosixPath(path.relative(outputDir, path.join(serviceRoot, config.main ?? 'dist/worker.js')))
  };
  const source = renderConfig(generatedConfig, environment, { includeRoutes });
  const suffix = includeRoutes ? 'with-routes' : 'deploy';
  const outputPath = path.join(outputDir, `wrangler.${environment}.${suffix}.toml`);
  fs.writeFileSync(outputPath, source);
  return outputPath;
}

export function renderConfig(config, environment, options = {}) {
  const includeRoutes = options.includeRoutes === true;
  const envConfig = readEnvironment(config, environment);
  const lines = [
    kv('name', config.workerNamePrefix ?? 'nucleus-account'),
    kv('main', config.main ?? 'dist/worker.js'),
    kv('compatibility_date', config.compatibilityDate ?? '2026-04-24'),
    array('compatibility_flags', config.compatibilityFlags ?? ['nodejs_compat']),
    kv('workers_dev', true),
    '',
    '[vars]',
    kv('NODE_ENV', 'production'),
    ''
  ];

  for (const lookupEnv of lookupEnvironments(config, environment)) {
    lines.push(...renderLookupEnvironment(config, lookupEnv), '');
  }

  for (const regionId of Object.keys(config.regions)) {
    if (!envConfig.regions[regionId]) continue;
    lines.push(...renderRegionalEnvironment(config, environment, regionId, { includeRoutes }), '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function routeDefinitions(config, environment, regions = Object.keys(config.regions)) {
  const envConfig = readEnvironment(config, environment);
  return regions.flatMap((regionId) => {
    const regionConfig = envConfig.regions[regionId];
    if (!regionConfig) {
      throw new Error(`Unknown ${environment} region: ${regionId}`);
    }
    return productDomains(config).map((domain) => ({
      pattern: `${accountHost(config, environment, regionId, domain)}/*`,
      script: workerName(config, environment, regionId),
      zoneName: domain
    }));
  });
}

export function missingHyperdriveIds(config, environment, regions) {
  const envConfig = readEnvironment(config, environment);
  const missing = [];
  for (const region of regions) {
    const regionConfig = envConfig.regions[region];
    if (!regionConfig) {
      missing.push(`${environment}/${region}: missing region config`);
      continue;
    }
    const value = resolveHyperdriveId(environment, region, regionConfig.hyperdriveId);
    if (isPlaceholder(value)) {
      missing.push(`${environment}/${region}: set ${hyperdriveOverrideName(environment, region, regionConfig.hyperdriveId)} or update services/account/config/environments.json`);
    }
  }
  return missing;
}

export function resolveHyperdriveId(environment, region, configuredValue) {
  const overrideName = hyperdriveOverrideName(environment, region, configuredValue);
  return process.env[overrideName]?.trim() || configuredValue;
}

function renderLookupEnvironment(config, lookupEnv) {
  const name = lookupEnv.workerName ?? `${config.workerNamePrefix}-${lookupEnv.id}`;
  return [
    header(`env.${lookupEnv.id}`),
    kv('name', name),
    kv('workers_dev', false),
    '',
    header(`env.${lookupEnv.id}.vars`),
    kv('NODE_ENV', 'production'),
    '',
    arrayHeader(`env.${lookupEnv.id}.durable_objects.bindings`),
    kv('name', 'AUTHFN_REGION_LOOKUP'),
    kv('class_name', 'AuthFnRegionLookupDurableObject'),
    '',
    arrayHeader(`env.${lookupEnv.id}.migrations`),
    kv('tag', 'v1-authfn-region-lookup'),
    array('new_sqlite_classes', ['AuthFnRegionLookupDurableObject'])
  ];
}

function renderRegionalEnvironment(config, environment, regionId, options) {
  const envConfig = readEnvironment(config, environment);
  const regionConfig = envConfig.regions[regionId];
  const wranglerEnv = regionConfig.wranglerEnv;
  const region = config.regions[regionId];
  const regionRecords = Object.keys(config.regions).flatMap((id) =>
    productDomains(config).map((domain) => ({
      regionId: id,
      authority: accountAuthority(config, environment, id, domain),
      hosts: [accountHost(config, environment, id, domain)],
      domain: cookieDomainForProductDomain(domain),
      cookie: { domain: cookieDomainForProductDomain(domain) }
    }))
  );
  const corsOrigins = webOrigins(config, environment, envConfig);
  const oauthReturnTo = [...corsOrigins, ...(config.nativeOAuthSchemes ?? [])];
  const oauthRedirectUris = ['google', 'apple'].map((provider) => [
    provider,
    Object.keys(config.regions)
      .flatMap((id) =>
        productDomains(config).map((domain) =>
          `${accountAuthority(config, environment, id, domain)}/auth/social/callback/${provider}`
        )
      )
      .join(',')
  ]);

  const lines = [
    header(`env.${wranglerEnv}`),
    kv('name', workerName(config, environment, regionId)),
    kv('workers_dev', envConfig.workersDev),
    '',
    header(`env.${wranglerEnv}.vars`),
    kv('NODE_ENV', 'production'),
    kv('AUTHFN_DEBUG_ERRORS', 'false'),
    kv('AUTHFN_OAUTH_DEBUG', 'false'),
    kv('AUTHFN_NAMESPACE', config.namespace),
    kv('AUTHFN_CACHE_PREFIX', envConfig.cachePrefix),
    kv('AUTHFN_COOKIE_PREFIX', envConfig.cookiePrefix ?? config.cookiePrefix),
    kv('AUTHFN_COOKIE_SECURE', 'true'),
    kv('ACCOUNT_LATENCY_DEBUG', String(envConfig.latencyDebug === true)),
    kv('DEBUG_SINK_URL', config.debugSinkUrl),
    kv('ACCOUNT_REGION_ID', regionId),
    kv('ACCOUNT_AUTHORITY', accountAuthority(config, environment, regionId)),
    kv('ACCOUNT_COOKIE_DOMAIN', cookieDomainForProductDomain(config.accountDomain)),
    kv('ACCOUNT_CORS_ORIGINS', corsOrigins.join(',')),
    kv('ACCOUNT_REGIONS_JSON', JSON.stringify(regionRecords)),
    kv('ACCOUNT_EMAIL_FROM', config.emailFrom)
  ];

  for (const [provider, redirectUris] of oauthRedirectUris) {
    lines.push(kv(`${provider.toUpperCase()}_OAUTH_REDIRECT_URIS`, redirectUris));
    lines.push(kv(`${provider.toUpperCase()}_OAUTH_RETURN_TO`, oauthReturnTo.join(',')));
  }

  lines.push('');
  if (region.placementRegion) {
    lines.push(header(`env.${wranglerEnv}.placement`));
    lines.push(kv('mode', 'targeted'));
    lines.push(kv('region', region.placementRegion));
    lines.push('');
  }

  if (options.includeRoutes) {
    for (const domain of productDomains(config)) {
      lines.push(arrayHeader(`env.${wranglerEnv}.routes`));
      lines.push(kv('pattern', `${accountHost(config, environment, regionId, domain)}/*`));
      lines.push(kv('zone_name', domain));
      lines.push('');
    }
  }

  lines.push(arrayHeader(`env.${wranglerEnv}.hyperdrive`));
  lines.push(kv('binding', 'ACCOUNT_DB'));
  lines.push(kv('id', resolveHyperdriveId(environment, regionId, regionConfig.hyperdriveId)));
  lines.push('');
  lines.push(arrayHeader(`env.${wranglerEnv}.kv_namespaces`));
  lines.push(kv('binding', 'ACCOUNT_CACHE'));
  lines.push(kv('id', envConfig.cacheKvNamespaceId));
  lines.push(kv('remote', true));
  lines.push('');
  lines.push(arrayHeader(`env.${wranglerEnv}.durable_objects.bindings`));
  lines.push(kv('name', 'AUTHFN_REGION_LOOKUP'));
  lines.push(kv('class_name', 'AuthFnRegionLookupDurableObject'));
  lines.push(kv('script_name', envConfig.lookupWorkerName));
  const secretsStoreBindings = secretStoreBindingsForEnvironment(config, environment);
  for (const binding of secretsStoreBindings) {
    lines.push('');
    lines.push(arrayHeader(`env.${wranglerEnv}.secrets_store_secrets`));
    lines.push(kv('binding', binding.binding));
    lines.push(kv('store_id', binding.storeId));
    lines.push(kv('secret_name', binding.secretName));
  }
  return lines;
}

export function secretStoreBindingsForEnvironment(config, environment) {
  const storeId = config.secretsStore?.storeId;
  const names = config.secretsStore?.names ?? {};
  if (!storeId) return [];
  return Object.entries(names).map(([binding, template]) => ({
    binding,
    storeId,
    secretName: renderSecretName(template, environment)
  }));
}

function renderSecretName(template, environment) {
  return String(template).replaceAll('{ENV}', environment.toUpperCase());
}

function lookupEnvironments(config, selectedEnvironment) {
  const selected = readEnvironment(config, selectedEnvironment);
  const entries = new Map();
  for (const [environment, envConfig] of Object.entries(config.environments)) {
    if (environment !== selectedEnvironment && envConfig.lookupWorkerEnv !== selected.lookupWorkerEnv) {
      continue;
    }
    entries.set(envConfig.lookupWorkerEnv, {
      id: envConfig.lookupWorkerEnv,
      workerName: envConfig.lookupWorkerName
    });
  }
  return [...entries.values()];
}

function webOrigins(config, environment, envConfig) {
  const origins = productDomains(config).map((domain) => `https://${envConfig.webSubdomain}.${domain}`);
  if (envConfig.includeLocalWebOrigins && environment !== 'local') {
    origins.push(...productDomains(config).map((domain) => `https://local.${domain}`));
  }
  origins.push('tauri://localhost');
  return origins;
}

function productDomains(config) {
  return Array.from(new Set(Object.values(config.productDomains ?? { default: config.accountDomain }).filter(Boolean)));
}

function accountAuthority(config, environment, regionId, domain = config.accountDomain) {
  return `https://${accountHost(config, environment, regionId, domain)}`;
}

function accountHost(config, environment, regionId, domain = config.accountDomain) {
  const envConfig = readEnvironment(config, environment);
  const suffix = envConfig.urlSegment ? `-${envConfig.urlSegment}` : '';
  return `account-${regionId}${suffix}.${domain}`;
}

function cookieDomainForProductDomain(domain) {
  return `.${domain.replace(/^\./, '')}`;
}

function workerName(config, environment, regionId) {
  return `${config.workerNamePrefix}-${environment}-${regionId}`;
}

function readEnvironment(config, environment) {
  const envConfig = config.environments[environment];
  if (!envConfig) {
    throw new Error(`Unknown account service environment: ${environment}`);
  }
  return envConfig;
}

function hyperdriveOverrideName(environment, region, configuredValue) {
  if (configuredValue?.startsWith('TODO_') || configuredValue?.startsWith('REPLACE_')) {
    return configuredValue;
  }
  return `ACCOUNT_${environment}_${region}_HYPERDRIVE_ID`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

function isPlaceholder(value) {
  return !value || value.startsWith('TODO_') || value.startsWith('REPLACE_');
}

function header(name) {
  return `[${name}]`;
}

function arrayHeader(name) {
  return `[[${name}]]`;
}

function kv(key, value) {
  if (typeof value === 'boolean') return `${key} = ${value}`;
  return `${key} = ${JSON.stringify(String(value))}`;
}

function array(key, values) {
  return `${key} = [${values.map((value) => JSON.stringify(String(value))).join(', ')}]`;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

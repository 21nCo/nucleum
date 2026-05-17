import fs from 'node:fs';
import path from 'node:path';

export function readConfig(serviceRoot) {
  return JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));
}

export function normalizeEnvironment(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

export function readEnvironment(config, environment) {
  const envConfig = config.environments[environment];
  if (!envConfig) {
    throw new Error(`Unknown frontend environment: ${environment}`);
  }
  return envConfig;
}

export function parseProducts(config, value) {
  const known = Object.keys(config.products);
  if (!value || value === 'all') return known;
  const products = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  for (const product of products) {
    if (!config.products[product]) {
      throw new Error(`Unknown frontend product: ${product}. Expected one of: ${known.join(', ')}`);
    }
  }
  return Array.from(new Set(products));
}

export function getArgValue(argv, name) {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = argv.indexOf(`--${name}`);
  if (index >= 0) return argv[index + 1];
  return undefined;
}

export function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

export function workerName(config, environment, productId) {
  return `${config.workerNamePrefix}-${productId}-${environment}`;
}

export function webHost(config, environment, productId) {
  const envConfig = readEnvironment(config, environment);
  const product = config.products[productId];
  return `${envConfig.webSubdomain}.${product.domain}`;
}

export function buildEnv(config, environment, productId) {
  const envConfig = readEnvironment(config, environment);
  const product = config.products[productId];
  if (!product) {
    throw new Error(`Unknown frontend product: ${productId}`);
  }

  const accountBaseUrlTemplate = envConfig.accountBaseUrlTemplate?.replaceAll('{domain}', product.domain);
  return removeUndefinedValues({
    ...config.defaultBuildEnv,
    ...envConfig.buildEnv,
    ...product.env?.[environment],
    VITE_PRODUCT: product.viteProduct ?? productId,
    VITE_HOST: webHost(config, environment, productId),
    VITE_ACCOUNT_BASE_URL_TEMPLATE: accountBaseUrlTemplate
  });
}

export function routeDefinitions(config, environment, products = Object.keys(config.products)) {
  readEnvironment(config, environment);
  return products.map((productId) => ({
    pattern: `${webHost(config, environment, productId)}/*`,
    script: workerName(config, environment, productId),
    zoneName: config.products[productId].domain
  }));
}

export function renderWranglerConfig(serviceRoot, repoRoot, config, environment, productId) {
  const envConfig = readEnvironment(config, environment);
  const product = config.products[productId];
  if (!product) {
    throw new Error(`Unknown frontend product: ${productId}`);
  }

  const outputDir = path.join(serviceRoot, '.wrangler');
  fs.mkdirSync(outputDir, { recursive: true });

  const buildDir = path.join(repoRoot, product.appPath, 'build');
  const wranglerConfig = {
    $schema: toPosixPath(path.relative(outputDir, path.join(repoRoot, 'node_modules/wrangler/config-schema.json'))),
    name: workerName(config, environment, productId),
    compatibility_date: config.compatibilityDate ?? '2026-05-16',
    workers_dev: envConfig.workersDev === true,
    assets: {
      directory: toPosixPath(path.relative(outputDir, buildDir)),
      not_found_handling: 'single-page-application'
    },
    observability: {
      enabled: true
    }
  };

  const outputPath = path.join(outputDir, `wrangler.${environment}.${productId}.deploy.jsonc`);
  fs.writeFileSync(outputPath, `${JSON.stringify(wranglerConfig, null, 2)}\n`);
  return outputPath;
}

export function writeCloudflareAssetHeaders(repoRoot, config, productId) {
  const product = config.products[productId];
  if (!product) {
    throw new Error(`Unknown frontend product: ${productId}`);
  }

  const buildDir = path.join(repoRoot, product.appPath, 'build');
  const headersPath = path.join(buildDir, '_headers');
  const existing = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, 'utf8') : '';
  const next = upsertManagedHeadersBlock(existing, managedCacheHeadersBlock());
  fs.writeFileSync(headersPath, next);
  return headersPath;
}

export function assertBuildOutput(repoRoot, config, productId) {
  const product = config.products[productId];
  const indexPath = path.join(repoRoot, product.appPath, 'build/index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing build output for ${productId}: ${indexPath}`);
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function removeUndefinedValues(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}

function managedCacheHeadersBlock() {
  return [
    '# BEGIN 21N_FRONTEND_CACHE_HEADERS',
    '# Versioned assets can be cached in the browser without revalidation.',
    '# Keep app shell files on Cloudflare Workers Static Assets defaults so update checks stay fresh.',
    '/_app/immutable/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/static/icons/sprite-:sprite.svg',
    '  Cache-Control: public, max-age=31536000, immutable',
    '# END 21N_FRONTEND_CACHE_HEADERS'
  ].join('\n');
}

function upsertManagedHeadersBlock(existing, block) {
  const normalizedBlock = block.trim();
  const start = '# BEGIN 21N_FRONTEND_CACHE_HEADERS';
  const end = '# END 21N_FRONTEND_CACHE_HEADERS';
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
  const trimmedExisting = existing.trim();
  const withTrailingNewline = (value) => value.replace(/\s*$/, '\n');

  if (pattern.test(existing)) {
    return withTrailingNewline(existing.replace(pattern, normalizedBlock));
  }

  if (!trimmedExisting) {
    return `${normalizedBlock}\n`;
  }

  return `${trimmedExisting}\n\n${normalizedBlock}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

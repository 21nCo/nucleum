import crypto from 'node:crypto';
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
  if (envConfig.hosts?.web) {
    return renderHostTemplate(envConfig.hosts.web, { product: productId, domain: product.domain });
  }
  return `${envConfig.webSubdomain}.${product.domain}`;
}

/** Cloudflare zone that owns the product's web host for an environment. */
export function routeZoneName(config, environment, productId) {
  const envConfig = readEnvironment(config, environment);
  return envConfig.hosts?.zoneName ?? config.products[productId].domain;
}

function renderHostTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value ?? '')),
    template
  );
}

export function buildEnv(config, environment, productId) {
  const envConfig = readEnvironment(config, environment);
  const product = config.products[productId];
  if (!product) {
    throw new Error(`Unknown frontend product: ${productId}`);
  }

  const accountBaseUrlTemplate = envConfig.accountBaseUrlTemplate
    ? renderHostTemplate(envConfig.accountBaseUrlTemplate, { product: productId, domain: product.domain })
    : undefined;
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
  const envConfig = readEnvironment(config, environment);
  return products.map((productId) => ({
    pattern: `${webHost(config, environment, productId)}/*`,
    script: workerName(config, environment, productId),
    zoneName: routeZoneName(config, environment, productId),
    zoneId: envConfig.hosts?.zoneId
  }));
}

export function wafExceptionDefinitions(config, environment, products = Object.keys(config.products)) {
  const envConfig = readEnvironment(config, environment);
  const staticFrontend = config.waf?.staticFrontend;
  if (!staticFrontend?.rules) {
    throw new Error('Missing static frontend WAF exception config.');
  }

  return products.map((productId) => {
    const host = webHost(config, environment, productId);
    return {
      zoneName: routeZoneName(config, environment, productId),
      zoneId: envConfig.hosts?.zoneId,
      rule: {
        ref: `21n_frontend_worker_asset_${environment}_${productId}`,
        description: `21n static frontend WAF exception: ${environment}/${productId}`,
        expression: [
          `http.host eq ${quoteCloudflareString(host)}`,
          `http.request.method in ${cloudflareStringSet(staticFrontend.methods ?? ['GET'])}`
        ].join(' and '),
        action: 'skip',
        action_parameters: {
          rules: staticFrontend.rules
        },
        logging: {
          enabled: true
        },
        enabled: true
      }
    };
  });
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
  const withCache = upsertManagedHeadersBlock(existing, managedCacheHeadersBlock(), CACHE_HEADERS_MARKERS);
  const securityBlock = managedSecurityHeadersBlock(productSecurityHeaders(config, buildDir));
  const next = upsertManagedHeadersBlock(withCache, securityBlock, SECURITY_HEADERS_MARKERS);
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

function cloudflareStringSet(values) {
  return `{${values.map(quoteCloudflareString).join(' ')}}`;
}

function quoteCloudflareString(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
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

const CACHE_HEADERS_MARKERS = {
  start: '# BEGIN 21N_FRONTEND_CACHE_HEADERS',
  end: '# END 21N_FRONTEND_CACHE_HEADERS'
};

const SECURITY_HEADERS_MARKERS = {
  start: '# BEGIN 21N_FRONTEND_SECURITY_HEADERS',
  end: '# END 21N_FRONTEND_SECURITY_HEADERS'
};

/**
 * Origins allowed to frame the web apps: the apps themselves, every product
 * domain and its subdomains (Memotron share pages embed the app), and the
 * zones that host non-live environments.
 */
export function frameAncestorSources(config) {
  const domains = new Set(Object.values(config.products ?? {}).map((product) => product.domain));
  for (const envConfig of Object.values(config.environments ?? {})) {
    if (envConfig.hosts?.zoneName) domains.add(envConfig.hosts.zoneName);
  }
  return ["'self'", ...[...domains].sort((left, right) => left.localeCompare(right)).flatMap((domain) => [`https://${domain}`, `https://*.${domain}`])];
}

/** Collects sha256 CSP sources for every inline script in the built HTML files. */
export function collectInlineScriptHashes(buildDir) {
  const hashes = new Set();
  for (const file of listHtmlFiles(buildDir)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)) {
      const attributes = match[1];
      if (/\bsrc\s*=/i.test(attributes)) continue;
      const type = attributes.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
      if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
      const digest = crypto.createHash('sha256').update(match[2], 'utf8').digest('base64');
      hashes.add(`'sha256-${digest}'`);
    }
  }
  return [...hashes].sort((left, right) => left.localeCompare(right));
}

function listHtmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

/**
 * Security headers for every static asset response. The enforced policy covers
 * framing, `<base>` and plugin content (limited to the app, blob: URLs and
 * https: sources, because PDF previews embed files from presigned storage and
 * legacy S3 URLs on many hosts; `data:` is not allowed); the script policy runs report-only until the
 * reported violations are reviewed, because third-party embeds and analytics
 * load scripts the policy has not been verified against yet.
 */
export function securityHeaders({ frameAncestors, inlineScriptHashes }) {
  const enforced = [
    "object-src 'self' blob: https:",
    "base-uri 'self'",
    `frame-ancestors ${frameAncestors.join(' ')}`
  ].join('; ');
  const reportOnly = [
    "default-src 'self'",
    ["script-src 'self'", ...inlineScriptHashes, "'wasm-unsafe-eval'", 'https:'].join(' '),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' data: blob: https: wss:",
    "frame-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'self' blob: https:",
    "base-uri 'self'",
    "form-action 'self' https:"
  ].join('; ');
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': enforced,
    'Content-Security-Policy-Report-Only': reportOnly
  };
}

/** Security headers for a product's static build output. */
export function productSecurityHeaders(config, buildDir) {
  return securityHeaders({
    frameAncestors: frameAncestorSources(config),
    inlineScriptHashes: collectInlineScriptHashes(buildDir)
  });
}

function managedSecurityHeadersBlock(headers) {
  return [
    SECURITY_HEADERS_MARKERS.start,
    '/*',
    ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`),
    SECURITY_HEADERS_MARKERS.end
  ].join('\n');
}

/** Replaces the managed block between the markers, or appends it when missing. */
export function upsertManagedHeadersBlock(existing, block, markers = CACHE_HEADERS_MARKERS) {
  const normalizedBlock = block.trim();
  const { start, end } = markers;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
  const trimmedExisting = existing.trim();
  const withTrailingNewline = (value) => value.replace(/\s*$/, '\n');

  if (pattern.test(existing)) {
    return withTrailingNewline(existing.replace(pattern, () => normalizedBlock));
  }

  if (!trimmedExisting) {
    return `${normalizedBlock}\n`;
  }

  return `${trimmedExisting}\n\n${normalizedBlock}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

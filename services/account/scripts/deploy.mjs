import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { applyCloudflareCredentialAliases } from '../../../tools/cloudflare/credential-aliases.mjs';
import { missingHyperdriveIds, missingSecretsStoreId, renderWranglerConfig } from './wrangler-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));

const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const regionsArg = process.argv.find((arg) => arg.startsWith('--regions='))?.split('=')[1];
const regions = regionsArg ? regionsArg.split(',').map((entry) => entry.trim()).filter(Boolean) : Object.keys(config.regions);
const dryRun = process.argv.includes('--dry-run');
// --outdir=<dir> (dry runs only) keeps each Worker bundle and its esbuild
// metafile under <dir>/<wranglerEnv>/ so the build output can be inspected.
const outdirArg = process.argv.find((arg) => arg.startsWith('--outdir='))?.slice('--outdir='.length);
const usage = 'Usage: node scripts/deploy.mjs <dev|pre|live> [--regions=insouth,useast,euwest] [--dry-run [--outdir=<dir>]]';

if (!environment || !config.environments[environment] || (outdirArg !== undefined && (!dryRun || !outdirArg.trim()))) {
  console.error(usage);
  process.exit(1);
}
const outdir = outdirArg ? path.resolve(process.env.INIT_CWD ?? process.cwd(), outdirArg) : null;

const envConfig = config.environments[environment];
const missing = missingHyperdriveIds(config, environment, regions);

if (missing.length > 0) {
  console.error(`Cannot deploy ${environment}; configure these Hyperdrive IDs first:`);
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const credentialsEnv = config.environments[environment].cloudflareCredentialsEnv;
const hasDevCredentialAliases = Boolean(
  credentialsEnv && process.env[credentialsEnv.accountId]?.trim() && process.env[credentialsEnv.token]?.trim()
);
if (credentialsEnv && !hasDevCredentialAliases && !/^(1|true)$/i.test(process.env.CI ?? '') && !dryRun) {
  console.error(`Cannot deploy ${environment} manually; set ${credentialsEnv.accountId} and ${credentialsEnv.token} (CI passes the selected credentials as CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN).`);
  process.exit(1);
}
applyCloudflareCredentialAliases(credentialsEnv);

const missingStore = missingSecretsStoreId(config, environment);
if (missingStore) {
  if (!dryRun) {
    console.error(`Cannot deploy ${environment}; configure the Secrets Store ID first:`);
    console.error(`- ${missingStore}`);
    process.exit(1);
  }
  console.warn(`Warning (dry run): Secrets Store ID is a placeholder: ${missingStore}`);
}

const wranglerConfig = renderWranglerConfig(serviceRoot, config, environment);

if (!dryRun) {
  for (const region of regions) {
    migrateDatafnDatabase(region);
  }
}

run('npm', ['run', 'build']);
deployWorker(envConfig.lookupWorkerEnv);

for (const region of regions) {
  deployWorker(envConfig.regions[region].wranglerEnv);
}

function deployWorker(wranglerEnv) {
  const bundleArgs = outdir
    ? ['--outdir', path.join(outdir, wranglerEnv), '--metafile', path.join(outdir, wranglerEnv, 'meta.json')]
    : [];
  run('wrangler', ['deploy', '--config', wranglerConfig, '--env', wranglerEnv, ...(dryRun ? ['--dry-run'] : []), ...bundleArgs]);
}

function migrateDatafnDatabase(region) {
  const variable = `DATAFN_${region}_DATABASE_URL`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  const databaseUrl = process.env[variable]?.trim();
  if (!databaseUrl) {
    console.error(`Cannot deploy ${environment}/${region}; set the ${variable} secret.`);
    process.exit(1);
  }
  const rootCaVariable = `DATAFN_${region}_ROOT_CA_PEM`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  run('npm', ['run', 'datafn:migrate'], {
    DATAFN_DATABASE_URL: databaseUrl,
    DATAFN_DEPLOY_ENVIRONMENT: environment,
    DATAFN_DEV_ROOT_CA_PEM: environment === 'dev' ? process.env[rootCaVariable] ?? '' : ''
  });
}

function run(command, args, env = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env
    },
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function normalizeEnvironment(value) {
  const normalized = value.trim().toLowerCase();
  if (['dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

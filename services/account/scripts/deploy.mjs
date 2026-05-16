import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { missingHyperdriveIds, renderWranglerConfig } from './wrangler-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));

const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const regionsArg = process.argv.find((arg) => arg.startsWith('--regions='))?.split('=')[1];
const regions = regionsArg ? regionsArg.split(',').map((entry) => entry.trim()).filter(Boolean) : Object.keys(config.regions);
const dryRun = process.argv.includes('--dry-run');

if (!environment || !config.environments[environment]) {
  console.error('Usage: node scripts/deploy.mjs <dev|pre|live> [--regions=insouth,useast,euwest] [--dry-run]');
  process.exit(1);
}

const envConfig = config.environments[environment];
const missing = missingHyperdriveIds(config, environment, regions);

if (missing.length > 0) {
  console.error(`Cannot deploy ${environment}; configure these Hyperdrive IDs first:`);
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const wranglerConfig = renderWranglerConfig(serviceRoot, config, environment);

run('npm', ['run', 'build']);
run('wrangler', ['deploy', '--config', wranglerConfig, '--env', envConfig.lookupWorkerEnv, ...(dryRun ? ['--dry-run'] : [])]);

for (const region of regions) {
  const wranglerEnv = envConfig.regions[region].wranglerEnv;
  run('wrangler', ['deploy', '--config', wranglerConfig, '--env', wranglerEnv, ...(dryRun ? ['--dry-run'] : [])]);
}

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: process.env,
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

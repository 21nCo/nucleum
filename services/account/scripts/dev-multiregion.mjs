import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { missingHyperdriveIds, renderWranglerConfig } from './wrangler-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const regionsArg = process.argv.find((arg) => arg.startsWith('--regions='))?.split('=')[1];

if (!environment || !config.environments[environment]) {
  console.error('Usage: node scripts/dev-multiregion.mjs <local|dev|pre|live>');
  process.exit(1);
}

const envConfig = config.environments[environment];
const regions = regionsArg ? regionsArg.split(',').map((entry) => entry.trim()).filter(Boolean) : Object.keys(config.regions);
const missing = missingHyperdriveIds(config, environment, regions);
if (missing.length > 0) {
  console.error(`Cannot run ${environment} multi-region Worker dev; configure these Hyperdrive IDs first:`);
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const wranglerConfig = renderWranglerConfig(serviceRoot, config, environment);
const children = [];

for (const regionId of regions) {
  const region = config.regions[regionId];
  if (!region) {
    console.error(`Unknown region: ${regionId}`);
    process.exit(1);
  }
  const regionalEnv = envConfig.regions[regionId]?.wranglerEnv;
  if (!regionalEnv) {
    continue;
  }
  const port = String(region.localPort);
  const child = spawn('wrangler', ['dev', '--config', wranglerConfig, '--env', regionalEnv, '--port', port, '--remote'], {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32'
  });
  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      child.kill(signal);
    }
    process.exit(0);
  });
}

function normalizeEnvironment(value) {
  const normalized = value.trim().toLowerCase();
  if (['local', 'dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

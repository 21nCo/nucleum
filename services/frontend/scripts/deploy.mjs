import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  assertBuildOutput,
  buildEnv,
  getArgValue,
  hasFlag,
  normalizeEnvironment,
  parseProducts,
  readConfig,
  readEnvironment,
  renderWranglerConfig
} from './frontend-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(serviceRoot, '..', '..');
const config = readConfig(serviceRoot);
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');

if (!environment) {
  console.error('Usage: node scripts/deploy.mjs <dev|pre|live> [--products=nucleum,memotron,pointron|all] [--skip-build] [--dry-run]');
  process.exit(1);
}

const products = parseProducts(config, getArgValue(process.argv, 'products') ?? 'all');
const skipBuild = hasFlag(process.argv, 'skip-build');
const dryRun = hasFlag(process.argv, 'dry-run');
const envConfig = readEnvironment(config, environment);

for (const productId of products) {
  const product = config.products[productId];
  if (!skipBuild) {
    run('npm', ['--workspace', product.workspace, 'run', envConfig.buildScript], {
      cwd: repoRoot,
      env: buildEnv(config, environment, productId)
    });
  }

  assertBuildOutput(repoRoot, config, productId);
  const wranglerConfig = renderWranglerConfig(serviceRoot, repoRoot, config, environment, productId);
  run(resolveWranglerBin(), ['deploy', '--config', wranglerConfig, ...(dryRun ? ['--dry-run'] : [])], {
    cwd: serviceRoot
  });
}

function resolveWranglerBin() {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  const localBin = path.join(serviceRoot, 'node_modules', '.bin', `wrangler${extension}`);
  if (fs.existsSync(localBin)) return localBin;
  return 'wrangler';
}

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? serviceRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

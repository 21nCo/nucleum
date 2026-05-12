import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const configPath = path.join(repoRoot, 'ios/config/environments.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const environment = normalizeEnvironment(process.argv[2]);
const region = (process.argv[3] ?? config.defaultRegion ?? 'insouth').trim().toLowerCase();

if (!environment) {
  console.error('Usage: node ios/scripts/configure-environment.mjs <local|dev|pre|live> [region]');
  process.exit(1);
}

for (const [appName, appConfig] of Object.entries(config.apps)) {
  const product = appConfig.product;
  if (!product) {
    throw new Error(`Missing product for ${appName} in ${configPath}`);
  }

  const nextValues = {
    NucleusAccountDomain: config.accountDomain,
    NucleusAppEnvironment: environment,
    NucleusDebugSinkUrl: config.debugSinkUrl,
    NucleusDefaultRegion: region,
    NucleusProduct: product
  };

  for (const plistFile of appConfig.plistFiles ?? []) {
    const plistPath = path.join(repoRoot, plistFile);
    for (const [key, value] of Object.entries(nextValues)) {
      setPlistString(plistPath, key, value);
    }
    deletePlistKey(plistPath, 'NucleusProductDomain');
  }

  console.log(`${appName}: ${environment}/${region} -> ${deriveWebOrigin(environment, product)}, ${deriveAccountUrl(environment, region, config.accountDomain)}`);
}

function normalizeEnvironment(value) {
  const normalized = value?.trim().toLowerCase();
  if (['local', 'dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

function setPlistString(plistPath, key, value) {
  if (!fs.existsSync(plistPath)) {
    throw new Error(`Missing plist file: ${plistPath}`);
  }
  const setResult = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plistPath], {
    stdio: 'ignore'
  });
  if (setResult.status === 0) return;

  const addResult = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plistPath], {
    stdio: 'inherit'
  });
  if (addResult.status !== 0) {
    throw new Error(`Failed to set ${key} in ${plistPath}`);
  }
}

function deletePlistKey(plistPath, key) {
  spawnSync('/usr/libexec/PlistBuddy', ['-c', `Delete :${key}`, plistPath], {
    stdio: 'ignore'
  });
}

function deriveWebOrigin(environment, product) {
  if (environment === 'local') return `https://local.${product}`;
  if (environment === 'pre') return `https://pre.${product}`;
  if (environment === 'live') return `https://web.${product}`;
  return `https://dev.${product}`;
}

function deriveAccountUrl(environment, region, accountDomain) {
  const suffix = environment === 'live' ? '' : `-${environment}`;
  return `https://account-${region}${suffix}.${accountDomain}`;
}

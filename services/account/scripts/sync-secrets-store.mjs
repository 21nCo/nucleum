import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { secretStoreBindingsForEnvironment } from './wrangler-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(serviceRoot, 'config/environments.json'), 'utf8'));
const environment = normalizeEnvironment(process.argv[2] ?? 'dev');
const replace = process.argv.includes('--replace');

if (!environment || !config.environments[environment]) {
  console.error('Usage: node scripts/sync-secrets-store.mjs <dev|pre|live> [--replace]');
  process.exit(1);
}

const accountId = readEnvValue('CLOUDFLARE_ACCOUNT_ID');
const token = readEnvValue('CLOUDFLARE_SECRETS_STORE_TOKEN')
  ?? readEnvValue('CLOUDFLARE_API_TOKEN')
  ?? readEnvValue('CLOUDFLARE_USER_TOKEN');
if (!accountId || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_SECRETS_STORE_TOKEN or CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

const envValues = readEnvironmentValues(environment);
const bindings = secretStoreBindingsForEnvironment(config, environment);
const missingLocalValues = bindings
  .map((binding) => binding.binding)
  .filter((binding) => !envValues[binding]);
if (missingLocalValues.length > 0) {
  console.error(`Missing local values for ${environment}: ${missingLocalValues.join(', ')}`);
  console.error(`Provide them in services/account/.env.${environment} or services/account/.env.local.`);
  process.exit(1);
}

const existing = await listSecrets(accountId, config.secretsStore.storeId, token);
const existingByName = new Map(existing.map((secret) => [secret.name, secret]));
const toCreate = [];

for (const binding of bindings) {
  const value = envValues[binding.binding];
  const existingSecret = existingByName.get(binding.secretName);
  if (!existingSecret) {
    toCreate.push({
      name: binding.secretName,
      value,
      scopes: ['workers'],
      comment: `Nucleus account ${environment} ${binding.binding}`
    });
    continue;
  }

  if (!replace) {
    console.log(`exists ${binding.secretName}`);
    continue;
  }

  await updateSecret(accountId, config.secretsStore.storeId, existingSecret.id, token, {
    value,
    scopes: ['workers'],
    comment: `Nucleus account ${environment} ${binding.binding}`
  });
  console.log(`updated ${binding.secretName}`);
}

if (toCreate.length > 0) {
  const created = await createSecrets(accountId, config.secretsStore.storeId, token, toCreate);
  for (const secret of created) {
    console.log(`created ${secret.name}`);
  }
}

if (toCreate.length === 0 && !replace) {
  console.log(`No missing ${environment} Secrets Store secrets.`);
}

function readEnvironmentValues(environment) {
  const result = {};
  for (const file of ['.env.local', `.env.${environment}`]) {
    const filePath = path.join(serviceRoot, file);
    if (!fs.existsSync(filePath)) continue;
    Object.assign(result, dotenv.parse(fs.readFileSync(filePath)));
  }
  return result;
}

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env.local', `.env.${environment}`]) {
    const filePath = path.join(serviceRoot, file);
    if (!fs.existsSync(filePath)) continue;
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    if (parsed[key]) return parsed[key];
  }
  return undefined;
}

async function listSecrets(accountId, storeId, token) {
  const result = await cloudflare(accountId, `/secrets_store/stores/${storeId}/secrets`, token);
  return Array.isArray(result) ? result : result?.secrets ?? [];
}

async function createSecrets(accountId, storeId, token, secrets) {
  const result = await cloudflare(accountId, `/secrets_store/stores/${storeId}/secrets`, token, {
    method: 'POST',
    body: secrets
  });
  return Array.isArray(result) ? result : result?.secrets ?? secrets.map((secret) => ({ name: secret.name }));
}

async function updateSecret(accountId, storeId, secretId, token, secret) {
  return cloudflare(accountId, `/secrets_store/stores/${storeId}/secrets/${secretId}`, token, {
    method: 'PUT',
    body: secret
  });
}

async function cloudflare(accountId, pathname, token, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(`Cloudflare API failed: ${JSON.stringify(payload.errors)}`);
  }
  return payload.result;
}

function normalizeEnvironment(value) {
  const normalized = value.trim().toLowerCase();
  if (['dev', 'pre', 'live'].includes(normalized)) return normalized;
  return null;
}

import process from 'node:process';

const ALTERNATE_CLOUDFLARE_CREDENTIAL_VARS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_API_KEY',
  'CLOUDFLARE_EMAIL',
  'CF_API_TOKEN',
  'CF_API_KEY',
  'CF_EMAIL',
  'CF_ACCOUNT_ID'
];

/**
 * Maps an environment's `cloudflareCredentialsEnv` aliases (for example
 * `CLOUDFLARE_DEV_ACCOUNT_ID` / `CLOUDFLARE_DEV_API_TOKEN`) onto the variables
 * Wrangler reads, in place on `process.env`. When the account ID alias is set,
 * every other Cloudflare credential variable is removed first, so Wrangler
 * uses the dev token or, without one, the `wrangler login` session, never
 * production credentials. Returns true when the aliases were applied.
 */
export function applyCloudflareCredentialAliases(credentialsEnv) {
  if (!credentialsEnv) return false;
  const accountId = process.env[credentialsEnv.accountId]?.trim();
  if (!accountId) return false;
  const token = process.env[credentialsEnv.token]?.trim();
  for (const key of ALTERNATE_CLOUDFLARE_CREDENTIAL_VARS) {
    delete process.env[key];
  }
  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  if (token) process.env.CLOUDFLARE_API_TOKEN = token;
  return true;
}

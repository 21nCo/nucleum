/**
 * Region ids the account service is deployed to (the keys of `regions` in
 * `config/environments.json`). A local single-backend setup serves every one
 * of them from one process, so validation uses this list rather than the
 * regions the process itself resolves.
 */
export const ACCOUNT_REGION_IDS = ['insouth', 'useast', 'euwest'] as const;

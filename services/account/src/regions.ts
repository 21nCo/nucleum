/**
 * Region ids the account service is deployed to (the keys of `regions` in
 * `config/environments.json`). A local single-backend setup serves every one
 * of them from one process, so validation uses this list rather than the
 * regions the process itself resolves.
 */
export const ACCOUNT_REGION_IDS = ['insouth', 'useast', 'euwest'] as const;

/**
 * Region ids `/nucleus/bootstrap` accepts. A deployed Worker is configured with
 * every region; a process configured with a single region is the local
 * single-backend setup, which serves all deployed regions.
 */
export function bootstrapRegionIds(configuredRegionIds: string[]): string[] {
  if (configuredRegionIds.length > 1) {
    return configuredRegionIds;
  }
  return Array.from(new Set([...configuredRegionIds, ...ACCOUNT_REGION_IDS]));
}

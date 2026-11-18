/**
 * Reads the FILE-9 container configuration from a copy of `env` without
 * `FILEFN_PROCESSORS`; every other setting is validated by `readContainerConfig`
 * and `env` is not modified.
 */
export declare function readNucleumContainerConfig<Env extends Record<string, string | undefined>, Config>(
  env: Env,
  readContainerConfig: (env: Record<string, string | undefined>) => Config
): Config;

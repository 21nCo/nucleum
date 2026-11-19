/**
 * Reads the FILE-9 container configuration from a copy of `env` without
 * `FILEFN_PROCESSORS`: Nucleum supplies its own processors, so the base image's
 * processor list is neither used nor validated. Every other setting is passed
 * through and validated by `readContainerConfig`; `env` itself is not modified.
 */
export function readNucleumContainerConfig(env, readContainerConfig) {
  const configEnv = { ...env };
  delete configEnv.FILEFN_PROCESSORS;
  return readContainerConfig(configEnv);
}

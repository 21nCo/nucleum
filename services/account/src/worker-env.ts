/** Cloudflare bindings and environment values available to the account Worker. */
export interface AccountWorkerEnv {
  ACCOUNT_DB?: {
    connectionString: string;
  };
  SYNC_DB?: {
    connectionString: string;
  };
  ACCOUNT_CACHE?: KVNamespace;
  AUTHFN_REGION_LOOKUP?: DurableObjectNamespace;
  ACCOUNT_RUNTIME_STORES?: DurableObjectNamespace;
  DATABASE_URL?: string;
  DATAFN_DATABASE_URL?: string;
  [key: string]: unknown;
}

/** Cloudflare Secrets Store binding exposed to the Worker runtime. */
export interface CloudflareSecretsStoreBinding {
  get(): Promise<string>;
  [key: string]: unknown;
}

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
  /** `local` (default), `remote` or `both`; see `services/account/config/environments.json`. */
  FILEFN_PROCESSING_MODE?: string;
  /** The region's `filefn.processing` queue producer (`remote` and `both` modes). */
  FILEFN_PROCESSING_QUEUE?: Queue;
  /** The region's processing container Durable Object (`remote` and `both` modes). */
  FILEFN_PROCESSING_CONTAINER?: DurableObjectNamespace;
  [key: string]: unknown;
}

/** Cloudflare Secrets Store binding exposed to the Worker runtime. */
export interface CloudflareSecretsStoreBinding {
  get(): Promise<string>;
  [key: string]: unknown;
}

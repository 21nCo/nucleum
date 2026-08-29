import { createSearchProvider } from '@searchfn/datafn-provider';
import { OpenSearchAdapter } from '@searchfn/adapter-opensearch';
import type { SuperfunctionObservability } from '@superfunctions/observability';
import {
  nucleumDatafnSearchDefaults,
  resolveNucleumDatafnSearchResourceFields
} from '@21n/shared-data/datafn';

/** Dependencies used to create account-service search integration. */
export interface CreateSyncSearchProviderInput {
  observability?: SuperfunctionObservability;
  regionId?: string;
}

/** Creates the account-service Sync SearchProvider when OpenSearch is configured. */
export function createSyncSearchProvider(
  input: CreateSyncSearchProviderInput
) {
  const node = process.env.DATAFN_OPENSEARCH_URL?.trim();
  if (!node) {
    return undefined;
  }
  const apiKey = process.env.DATAFN_OPENSEARCH_API_KEY;
  const username = process.env.DATAFN_OPENSEARCH_USERNAME;
  const password = process.env.DATAFN_OPENSEARCH_PASSWORD;
  const indexPrefix =
    process.env.DATAFN_OPENSEARCH_INDEX_PREFIX ??
    ['nucleum', process.env.NODE_ENV ?? 'dev', input.regionId ?? 'default']
      .join('_')
      .replace(/[^a-z0-9_]/gi, '_')
      .toLowerCase();
  const auth = apiKey
    ? { apiKey }
    : username && password
      ? { username, password }
      : undefined;

  return createSearchProvider(
    new OpenSearchAdapter({
      node,
      auth,
      indexPrefix,
      defaults: nucleumDatafnSearchDefaults,
      requestTimeoutMs: Number(
        process.env.DATAFN_OPENSEARCH_REQUEST_TIMEOUT_MS ?? 30_000
      ),
      retry: {
        maxRetries: Number(process.env.DATAFN_OPENSEARCH_MAX_RETRIES ?? 2),
        baseDelayMs: Number(process.env.DATAFN_OPENSEARCH_RETRY_BASE_MS ?? 100),
        maxDelayMs: Number(process.env.DATAFN_OPENSEARCH_RETRY_MAX_MS ?? 5_000)
      },
      observability: input.observability
    }),
    {
      resourceFields: resolveNucleumDatafnSearchResourceFields(),
      observability: input.observability
    }
  );
}

import { createDynamoDbAtomicKVStore } from '@superfunctions/db/adapters/dynamodb';
import type { ConditionalKVStoreAdapter } from '@superfunctions/db';

export function createAccountLookupStore(): ConditionalKVStoreAdapter | undefined {
  const tableName = process.env.AUTHFN_REGION_LOOKUP_TABLE;
  if (!tableName) {
    return undefined;
  }

  return createDynamoDbAtomicKVStore({
    tableName,
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT,
    consistentRead: process.env.AUTHFN_REGION_LOOKUP_CONSISTENT_READ === 'true'
  });
}

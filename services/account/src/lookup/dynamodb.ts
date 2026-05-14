import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AuthFnRegionLookupRecord,
  AuthFnRegionLookupStore,
} from '@authfn/core';

const LOOKUP_RECORD_SORT_KEY = 'LOOKUP';

class AuthFnDynamoDbLookupStoreError extends Error {
  readonly operation: string;
  readonly retryable: boolean;

  constructor(operation: string, cause: unknown) {
    super(`AuthFn DynamoDB lookup store failed during ${operation}`, {
      cause,
    });
    this.name = 'AuthFnDynamoDbLookupStoreError';
    this.operation = operation;
    this.retryable = isRetryableDynamoError(cause);
  }
}

export function createAccountLookupStore(): AuthFnRegionLookupStore | undefined {
  const tableName = process.env.AUTHFN_REGION_LOOKUP_TABLE;
  if (!tableName) {
    return undefined;
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }));
  const consistentRead = process.env.AUTHFN_REGION_LOOKUP_CONSISTENT_READ === 'true';

  return {
    async getByIdentifier(identifier) {
      try {
        const result = await client.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#pk = :identifier',
          ExpressionAttributeNames: {
            '#pk': 'PK',
          },
          ExpressionAttributeValues: {
            ':identifier': identifier,
          },
          ConsistentRead: consistentRead,
          Limit: 1,
        }));

        const item = result.Items?.[0];
        return item ? fromItem(item) : null;
      } catch (error) {
        throw new AuthFnDynamoDbLookupStoreError('getByIdentifier', error);
      }
    },

    async putIfAbsent(record) {
      const item = toItem(record);
      try {
        await client.send(new PutCommand({
          TableName: tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(PK)',
        }));
        return {
          inserted: true,
        };
      } catch (error) {
        if (isConditionalCheckFailed(error)) {
          const existing = await this.getByIdentifier(record.identifier);
          return {
            inserted: false,
            existing: existing ?? undefined,
          };
        }

        throw new AuthFnDynamoDbLookupStoreError('putIfAbsent', error);
      }
    },

    async update(record) {
      try {
        const result = await client.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: record.identifier,
            SK: LOOKUP_RECORD_SORT_KEY,
          },
          UpdateExpression: [
            'SET #identifier = :identifier',
            '#userId = :userId',
            '#regionId = :regionId',
            '#authority = :authority',
            '#domain = :domain',
            '#createdAt = if_not_exists(#createdAt, :createdAt)',
            '#updatedAt = :updatedAt',
          ].join(', '),
          ExpressionAttributeNames: {
            '#identifier': 'identifier',
            '#userId': 'userId',
            '#regionId': 'regionId',
            '#authority': 'authority',
            '#domain': 'domain',
            '#createdAt': 'createdAt',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':identifier': record.identifier,
            ':userId': record.userId ?? null,
            ':regionId': record.regionId,
            ':authority': record.authority,
            ':domain': record.domain ?? null,
            ':createdAt': serializeDate(record.createdAt),
            ':updatedAt': serializeDate(record.updatedAt),
          },
          ReturnValues: 'ALL_NEW',
        }));

        if (!result.Attributes) {
          throw new Error('DynamoDB update returned no attributes');
        }

        return fromItem(result.Attributes);
      } catch (error) {
        throw new AuthFnDynamoDbLookupStoreError('update', error);
      }
    },

    async deleteByIdentifier(identifier) {
      const existing = await this.getByIdentifier(identifier);
      if (!existing) {
        return;
      }

      try {
        await client.send(new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: existing.identifier,
            SK: LOOKUP_RECORD_SORT_KEY,
          },
        }));
      } catch (error) {
        throw new AuthFnDynamoDbLookupStoreError('deleteByIdentifier', error);
      }
    },
  };
}

function toItem(record: AuthFnRegionLookupRecord): Record<string, unknown> {
  return {
    PK: record.identifier,
    SK: LOOKUP_RECORD_SORT_KEY,
    identifier: record.identifier,
    userId: record.userId ?? null,
    regionId: record.regionId,
    authority: record.authority,
    domain: record.domain ?? null,
    createdAt: serializeDate(record.createdAt),
    updatedAt: serializeDate(record.updatedAt),
  };
}

function fromItem(item: Record<string, unknown>): AuthFnRegionLookupRecord {
  return {
    identifier: readString(item.identifier ?? item.PK, 'identifier'),
    userId: readOptionalString(item.userId),
    regionId: readString(item.regionId, 'regionId'),
    authority: readString(item.authority, 'authority'),
    domain: readOptionalString(item.domain),
    createdAt: readString(item.createdAt, 'createdAt'),
    updatedAt: readString(item.updatedAt, 'updatedAt'),
  };
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`DynamoDB lookup record is missing ${field}`);
  }
  return value;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === 'object'
      && (error as { name?: unknown }).name === 'ConditionalCheckFailedException',
  );
}

function isRetryableDynamoError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybe = error as {
    $retryable?: unknown;
    name?: unknown;
  };
  return Boolean(maybe.$retryable || maybe.name === 'ProvisionedThroughputExceededException');
}

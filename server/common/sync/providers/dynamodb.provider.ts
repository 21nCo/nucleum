import { Agent } from "$lib/server/common/account/account.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  ISyncUpBody,
  ISyncDownBody,
  ICloneUpBody,
  ICloneDownBody,
  ICloneDownPaginateBody,
  IReconcileBody
} from "$lib/shared/types/sync.type";
import { IMutation, PersistenceActionType } from "$lib/client/types/data.type";
import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
import { ISyncProvider, SyncProvider } from "./types";
import { resolveProviderRegionCode } from "$lib/deployment/deploy.utils";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  BatchGetCommand,
  QueryCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { Select } from "@aws-sdk/client-dynamodb";

/**
 * DynamoDB Sync Provider using Single Table Design Pattern
 *
 *
 *
 * Access Patterns:
 * 1.  Clone down - resource records (Get all records of a resource type for a user/space): PK = "{spaceId}#{resource}"
 *
 * 2. Sync down - mutation records
 * 2a. Get mutations for given resource since timestamp: PK = "{spaceId}#mutation#{resource}", SK > "{timestamp}#"
 * 2b. Get specific resource record : PK = "{spaceId}#{resource}", SK = "{recordId}"
 *
 * 3. Paginate - resource records (Get records of a resource with offset and limit): PK = "{spaceId}#{resource}", Limit
 *
 * 4. Relay - mutation records (Get all mutations for a specific record): GSI1PK (spaceId) = "{spaceId}", GSI1SK = "mutation#{recordId}"
 *
 * 5. Delete user - everything (Get everything for a user/space): GSI1PK (spaceId) = "{spaceId}"
 *
 *
 */

interface DynamoDBConfig {
  tableName: string;
  region: string;
}

interface DynamoDBItem {
  PK: string; // Partition Key: userId#{resource} or userId#mutation#{resource}
  SK: string; // Sort Key: {resourceId} or {timestamp}#{mutationId}
  userId: string;
  action?: ResourceActionType;
  timestamp?: number;
  dapId?: string;
  TTL?: number; // For automatic deletion of old records if applicable
  [key: string]: any; // Allow for spread resource attributes
}

export class DynamoDBSyncProvider implements ISyncProvider {
  name: SyncProvider = SyncProvider.DYNAMODB;
  private config: DynamoDBConfig;

  private getDynamoClient(agent: Agent): DynamoDBDocumentClient {
    let region = "us-east-1";
    const prefix = process.env.DYNAMODB_TABLE_PREFIX || "user";
    if (agent?.region) {
      region = resolveProviderRegionCode(agent.region, "aws");
      // console.log("resolved region:", { region, agentRegion: agent.region });
    }
    this.config = {
      tableName: prefix + "-" + region,
      region
    };

    const client = new DynamoDBClient({ region });
    return DynamoDBDocumentClient.from(client);
  }

  async syncUp(body: ISyncUpBody, agent: Agent): Promise<any> {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const { mutations, lastSyncDown, resources, dapId } = body;
      if (!mutations || !Array.isArray(mutations) || mutations.length < 1) {
        return { error: "No mutations to sync" };
      }

      const spaceId = agent.db;
      const userId = agent.id?.includes("user:")
        ? agent.id
        : `user:${agent.id}`;

      const batchSize = 25;
      for (let i = 0; i < mutations.length; i += batchSize) {
        const batch = mutations.slice(i, i + batchSize);

        const mutationPromises = batch.map(async (mutation) => {
          const recordId = Array.isArray(mutation.resourceId)
            ? mutation.resourceId[0]
            : mutation.resourceId;

          const mutationItem: DynamoDBItem = {
            PK: `${spaceId}#mutation`,
            SK: `${mutation.timestamp}#${mutation.id}`,
            GSI1SK: `mutation#${recordId}`,
            spaceId,
            userId,
            dapId,
            ...mutation
          };

          const records = await this.applyMutationToResource(
            mutation,
            spaceId,
            userId,
            dynamoClient
          );

          return {
            mutationItem,
            records
          };
        });

        const mutationResults = await Promise.all(mutationPromises);

        const allPutItems = [];
        for (const { mutationItem, records } of mutationResults) {
          allPutItems.push({ PutRequest: { Item: mutationItem } });

          if (records.length > 0) {
            records.forEach((item) => {
              allPutItems.push({ PutRequest: { Item: item } });
            });
          }
        }

        const writeBatchSize = 25;
        console.time("syncUp-writeBatch");
        for (let j = 0; j < allPutItems.length; j += writeBatchSize) {
          const writeBatch = allPutItems.slice(j, j + writeBatchSize);

          if (writeBatch.length > 0) {
            const params = {
              RequestItems: {
                [this.config.tableName]: writeBatch
              }
            };

            await dynamoClient.send(new BatchWriteCommand(params));
          }
        }
        console.timeEnd("syncUp-writeBatch");
      }
      const syncDownResponse = await this.syncDown(
        {
          lastSyncDown,
          resources,
          dapId
        },
        agent
      );

      return syncDownResponse;
    } catch (e) {
      console.error({ at: "DynamoDB syncUp - error", error: e });
      return { error: "Sync failed" };
    }
  }

  async syncDown(body: ISyncDownBody, agent: Agent): Promise<any> {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const { lastSyncDown, resources, dapId } = body;
      if (!resources || resources?.length < 1)
        return { error: "No resources found" };

      const spaceId = agent.db;
      const mutations: any[] = [];
      const records: any[] = [];
      const deleted: any[] = [];
      let latestTimestamp = lastSyncDown;
      console.time("syncDown-mutations");
      const params = {
        TableName: this.config.tableName,
        KeyConditionExpression: "PK = :pk AND SK > :lastSync",
        ExpressionAttributeValues: {
          ":pk": `${spaceId}#mutation`,
          ":lastSync": `${lastSyncDown}#`
        },
        ScanIndexForward: false // Sort descending by timestamp
      };

      const allMutationsResult = await dynamoClient.send(
        new QueryCommand(params)
      );
      console.timeEnd("syncDown-mutations");

      console.time("syncDown-records");
      const recordKeysToFetch: { key: { PK: string; SK: string } }[] = [];
      const resourcesSet = new Set(resources);

      if (allMutationsResult.Items) {
        for (const item of allMutationsResult.Items) {
          if (!resourcesSet.has(item.resource)) {
            continue;
          }
          if (item.dapId && item.dapId === dapId) {
            continue;
          }
          mutations.push(this.getResourceData(item));
          if (item.timestamp > latestTimestamp) {
            latestTimestamp = item.timestamp;
          }
          if (item.action !== ResourceActionType.DELETE) {
            const mutation = this.getResourceData(item);
            const recordIds = Array.isArray(mutation.resourceId)
              ? mutation.resourceId
              : [mutation.resourceId];
            for (const recordId of recordIds) {
              recordKeysToFetch.push({
                key: {
                  PK: `${spaceId}#${item.resource}`,
                  SK: recordId
                }
              });
            }
          } else {
            deleted.push(this.getResourceData(item));
          }
        }
      }
      if (recordKeysToFetch.length > 0) {
        const batchedRecords = await this.batchGetItems(
          recordKeysToFetch.map((item) => item.key),
          dynamoClient
        );
        records.push(...batchedRecords);
      }
      console.timeEnd("syncDown-records");

      console.time("syncDown-counts");
      const counts = await this.getResourceCounts(
        resources,
        spaceId,
        dynamoClient
      );
      console.timeEnd("syncDown-counts");
      return {
        latestTimestamp:
          latestTimestamp > lastSyncDown
            ? { timestamp: latestTimestamp }
            : null,
        records,
        deleted,
        counts
      };
    } catch (e) {
      console.error({ at: "DynamoDB syncDown - error", error: e });
      return { error: "Sync failed" };
    }
  }

  async cloneUp(body: ICloneUpBody, agent: Agent): Promise<any> {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const { resource, records } = body;
      const spaceId = agent.db;
      const userId = agent.id;

      const batchSize = 25;
      const responses = [];
      const commonAttributes = {
        PK: `${spaceId}#${resource}`,
        spaceId,
        userId
      };

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const putRequests = batch.map((record) => {
          const item: DynamoDBItem = {
            ...commonAttributes,
            SK: record.id,
            modifiedAtUnix: record.modifiedAt
              ? new Date(record.modifiedAt).getTime()
              : Date.now(),
            ...record
          };

          return {
            PutRequest: { Item: item }
          };
        });

        const params = {
          RequestItems: {
            [this.config.tableName]: putRequests
          }
        };

        const result = await dynamoClient.send(new BatchWriteCommand(params));
        responses.push(result);
      }

      return responses;
    } catch (e) {
      console.error({ at: "DynamoDB cloneUp - error", error: e });
      return { error: "Sync failed" };
    }
  }

  async cloneDown(body: ICloneDownBody, agent: Agent): Promise<any> {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const { resources, isExtension } = body;
      if (resources?.length < 1) return { error: "No resources found" };

      const limit = body.limit || 500;
      const spaceId = agent.db;

      const queryPromises = resources.map(async (resource) => {
        try {
          const params = {
            TableName: this.config.tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
              ":pk": `${spaceId}#${resource}`
            },
            Limit: limit,
            ScanIndexForward: true
          };

          const result = await dynamoClient.send(new QueryCommand(params));
          return { resource, result, error: null };
        } catch (error) {
          console.error(`Error querying resource ${resource}:`, error);
          return { resource, result: null, error: error.message };
        }
      });

      const queryResults = await Promise.all(queryPromises);

      const results = [];
      for (const { resource, result, error } of queryResults) {
        if (error) {
          console.error(`Failed to fetch resource ${resource}: ${error}`);
          results.push([]);
          continue;
        }

        if (result?.Items) {
          const resourceData = result.Items.map((item) => {
            if (isExtension) {
              return this.getResourceData(item);
            } else {
              return {
                ...this.getResourceData(item),
                id: item.SK
              };
            }
          });
          results.push(resourceData);
        } else {
          results.push([]);
        }
      }

      return results;
    } catch (e) {
      console.error({ at: "DynamoDB cloneDown - error", error: e });
      return { error: "Sync failed" };
    }
  }

  async paginate(body: ICloneDownPaginateBody, agent: Agent): Promise<any> {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const { resource, offset, limit, isExtension } = body;
      const spaceId = agent.db;

      // For small offsets, use the existing approach
      if (offset <= 100) {
        const params: any = {
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `${spaceId}#${resource}`
          },
          Limit: offset + limit,
          ScanIndexForward: true
        };

        const result = await dynamoClient.send(new QueryCommand(params));
        if (result.Items) {
          let items = result.Items.slice(offset);

          const resourceData = items.map((item) => {
            if (isExtension) {
              return this.getResourceData(item);
            } else {
              return {
                ...this.getResourceData(item),
                id: item.SK
              };
            }
          });

          return resourceData;
        }
      } else {
        // For large offsets, use multiple queries with ExclusiveStartKey
        let currentOffset = 0;
        let lastEvaluatedKey = undefined;

        // Skip to the desired offset
        while (currentOffset < offset) {
          const skipParams: any = {
            TableName: this.config.tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
              ":pk": `${spaceId}#${resource}`
            },
            Limit: Math.min(100, offset - currentOffset),
            ScanIndexForward: true
          };

          if (lastEvaluatedKey) {
            skipParams.ExclusiveStartKey = lastEvaluatedKey;
          }

          const skipResult = await dynamoClient.send(
            new QueryCommand(skipParams)
          );
          currentOffset += skipResult.Count || 0;
          lastEvaluatedKey = skipResult.LastEvaluatedKey;

          if (!lastEvaluatedKey) break; // No more items
        }

        // Now get the actual page
        if (lastEvaluatedKey || currentOffset === offset) {
          const params: any = {
            TableName: this.config.tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
              ":pk": `${spaceId}#${resource}`
            },
            Limit: limit,
            ScanIndexForward: true
          };

          if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
          }

          const result = await dynamoClient.send(new QueryCommand(params));
          if (result.Items) {
            const resourceData = result.Items.map((item) => {
              if (isExtension) {
                return this.getResourceData(item);
              } else {
                return {
                  ...this.getResourceData(item),
                  id: item.SK
                };
              }
            });

            return resourceData;
          }
        }
      }

      return [];
    } catch (e) {
      console.error({ at: "DynamoDB cloneDownPaginate - error", error: e });
      return { error: "Sync failed" };
    }
  }

  async reconcile(body: IReconcileBody, agent: Agent): Promise<any> {
    try {
      const { resources } = body;
      const spaceId = agent.db;

      for (const resource of resources) {
        switch (resource) {
          case Resource.node:
            await this.runReconciliationForNodeResource(agent);
            break;
          // Add other resource reconciliation logic as needed
        }
      }
      return { success: true };
    } catch (e) {
      console.error({ at: "DynamoDB reconcile - error", error: e });
      return { error: "Sync failed" };
    }
  }

  private async runReconciliationForNodeResource(agent: Agent) {
    try {
      const dynamoClient = this.getDynamoClient(agent);
      const spaceId = agent.db;

      // Query all nodes for this user
      const params = {
        TableName: this.config.tableName,
        KeyConditionExpression: "PK = :pk",
        FilterExpression:
          "attribute_not_exists(contentType) OR contentType = :none",
        ExpressionAttributeValues: {
          ":pk": `${spaceId}#${Resource.node}`,
          ":none": null
        }
      };

      const result = await dynamoClient.send(new QueryCommand(params));

      if (result.Items && result.Items.length > 0) {
        // Delete bad nodes in batches
        const batchSize = 25;
        for (let i = 0; i < result.Items.length; i += batchSize) {
          const batch = result.Items.slice(i, i + batchSize);
          const deleteRequests = batch.map((item) => ({
            DeleteRequest: {
              Key: {
                PK: item.PK,
                SK: item.SK
              }
            }
          }));

          const deleteParams = {
            RequestItems: {
              [this.config.tableName]: deleteRequests
            }
          };

          await dynamoClient.send(new BatchWriteCommand(deleteParams));
        }
      }
    } catch (e) {
      console.error({ at: "DynamoDB reconcile - node - error", error: e });
      return { error: "Sync failed" };
    }
  }

  private async applyMutationToResource(
    mutation: IMutation,
    spaceId: string,
    userId: string,
    dynamoClient: DynamoDBDocumentClient
  ): Promise<DynamoDBItem[]> {
    try {
      const { resource, resourceId, action, params } = mutation;
      const items: DynamoDBItem[] = [];
      const commonAttributes = {
        PK: `${spaceId}#${resource}`,
        spaceId,
        userId,
        modifiedAtUnix: mutation.timestamp,
        GSI1SK: resource
      };
      switch (action) {
        case ResourceActionType.CREATE:
        case ResourceActionType.EDIT:
          if (
            params.action === PersistenceActionType.INSERT ||
            params.action === PersistenceActionType.BULK_INSERT
          ) {
            const records = "records" in params ? params.records : [];
            for (const record of records) {
              const item: DynamoDBItem = {
                ...commonAttributes,
                ...record,
                SK: record.id.toString()
              };
              items.push(item);
            }
          } else if (
            params.action === PersistenceActionType.REPLACE &&
            "record" in params
          ) {
            if (!resourceId) return [];
            const resourceIds = Array.isArray(resourceId)
              ? resourceId
              : [resourceId];

            for (const rId of resourceIds) {
              const item: DynamoDBItem = {
                ...commonAttributes,
                ...params.record,
                SK: rId.toString()
              };
              items.push(item);
            }
          } else if (
            params.action === PersistenceActionType.MERGE &&
            "record" in params
          ) {
            if (!resourceId) return [];
            const resourceIds = Array.isArray(resourceId)
              ? resourceId
              : [resourceId];

            for (const rId of resourceIds) {
              const mergeResult = await this.performMergeOperation(
                params.record,
                rId.toString(),
                commonAttributes.PK,
                commonAttributes,
                dynamoClient
              );
              if (mergeResult) {
                items.push(mergeResult);
              }
            }
          } else if (
            params.action === PersistenceActionType.BULK_MERGE &&
            "records" in params
          ) {
            const records = params.records;
            if (!records || records.length < 1) return [];
            for (const record of records) {
              if (!record.id) continue;
              const { id, ...mergeData } = record;

              const mergeResult = await this.performMergeOperation(
                mergeData,
                id.toString(),
                commonAttributes.PK,
                commonAttributes,
                dynamoClient
              );
              if (mergeResult) {
                items.push(mergeResult);
              }
            }
          }
          break;

        case ResourceActionType.DELETE:
          if (params.action === PersistenceActionType.DELETE) {
            if (!resourceId) return [];
            const resourceIds = Array.isArray(resourceId)
              ? resourceId
              : [resourceId];

            for (const rId of resourceIds) {
              const deleteParams = {
                TableName: this.config.tableName,
                Key: {
                  PK: `${spaceId}#${resource}`,
                  SK: rId.toString()
                }
              };
              await dynamoClient.send(new DeleteCommand(deleteParams));
            }
          } else if (params.action === PersistenceActionType.BULK_DELETE) {
            const recordIds = "recordIds" in params ? params.recordIds : [];
            if (!recordIds || recordIds.length < 1) return [];
            const batchSize = 25;
            for (let i = 0; i < recordIds.length; i += batchSize) {
              const batch = recordIds.slice(i, i + batchSize);
              const deleteRequests = batch.map((id) => ({
                DeleteRequest: {
                  Key: {
                    PK: `${spaceId}#${resource}`,
                    SK: id.toString()
                  }
                }
              }));

              const deleteParams = {
                RequestItems: {
                  [this.config.tableName]: deleteRequests
                }
              };

              await dynamoClient.send(new BatchWriteCommand(deleteParams));
            }
          }
          break;
      }

      // Handle CUSTOM mutations at the params level
      if (params.action === PersistenceActionType.CUSTOM) {
        // Handle CUSTOM operation - for now, log that it's not implemented
        // In the future, this could execute custom DynamoDB operations
        console.warn(
          "CUSTOM mutations are not yet implemented for DynamoDB provider"
        );
      }

      return items;
    } catch (e) {
      console.error({ at: "applyMutationToResource - error", error: e });
      return [];
    }
  }

  /**
   * Helper method to perform merge operations, abstracting common logic between MERGE and BULK_MERGE
   */
  private async performMergeOperation(
    mergeData: Record<string, any>,
    sortKey: string,
    partitionKey: string,
    fallbackAttributes: Record<string, any>,
    dynamoClient: DynamoDBDocumentClient
  ): Promise<DynamoDBItem | null> {
    try {
      const updateExpressions = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression for each field in the record
      Object.keys(mergeData).forEach((key, index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = mergeData[key];
        updateExpressions.push(`${attrName} = ${attrValue}`);
      });

      const updateParams = {
        TableName: this.config.tableName,
        Key: {
          PK: partitionKey,
          SK: sortKey
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: "attribute_exists(PK) OR attribute_not_exists(PK)"
      };

      try {
        await dynamoClient.send(new UpdateCommand(updateParams));
        return null; // No item to add to batch when update succeeds
      } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
          // Item doesn't exist, create it with the merge data
          const item: DynamoDBItem = {
            PK: partitionKey,
            SK: sortKey,
            userId: fallbackAttributes.userId || "",
            ...fallbackAttributes,
            ...mergeData
          };
          return item;
        } else {
          throw error;
        }
      }
    } catch (e) {
      console.error({ at: "performMergeOperation - error", error: e });
      return null;
    }
  }

  /**
   * Efficiently batch get multiple items using BatchGetCommand instead of individual GetCommand calls.
   * Handles DynamoDB's 100-item limit per batch and retries unprocessed keys.
   */
  private async batchGetItems(
    keys: { PK: string; SK: string }[],
    dynamoClient: DynamoDBDocumentClient
  ): Promise<any[]> {
    const results: any[] = [];
    const batchSize = 100;
    const seen = new Set<string>();
    const uniqueKeys = keys.filter((key) => {
      const keyString = `${key.PK}#${key.SK}`;
      if (seen.has(keyString)) {
        return false;
      }
      seen.add(keyString);
      return true;
    });

    try {
      for (let i = 0; i < uniqueKeys.length; i += batchSize) {
        const batchKeys = uniqueKeys.slice(i, i + batchSize);

        const params = {
          RequestItems: {
            [this.config.tableName]: {
              Keys: batchKeys
            }
          }
        };

        const result = await dynamoClient.send(new BatchGetCommand(params));

        if (result.Responses && result.Responses[this.config.tableName]) {
          for (const item of result.Responses[this.config.tableName]) {
            results.push(this.getResourceData(item));
          }
        }

        if (
          result.UnprocessedKeys &&
          Object.keys(result.UnprocessedKeys).length > 0
        ) {
          console.warn(
            "Unprocessed keys in batch get operation:",
            result.UnprocessedKeys
          );
          const unprocessedKeys =
            result.UnprocessedKeys[this.config.tableName]?.Keys || [];
          if (unprocessedKeys.length > 0) {
            const retryResults = await this.batchGetItems(
              unprocessedKeys as { PK: string; SK: string }[],
              dynamoClient
            );
            results.push(...retryResults);
          }
        }
      }
    } catch (e) {
      console.error({ at: "batchGetItems - error", error: e });
    }

    return results;
  }

  /**
   * Gets resource counts using GSI query for better performance than individual resource queries.
   * Uses a single GSI query to fetch all items for a space and counts them in memory.
   * Falls back to individual queries if GSI query fails.
   */
  private async getResourceCounts(
    resources: Resource[],
    spaceId: string,
    dynamoClient: DynamoDBDocumentClient
  ): Promise<any[]> {
    try {
      const params: any = {
        TableName: this.config.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "spaceId = :spaceId",
        ExpressionAttributeValues: {
          ":spaceId": spaceId
        },
        Select: "ALL_ATTRIBUTES" as const
      };

      const resourceCounts: { [key: string]: number } = {};
      resources.forEach((resource) => {
        resourceCounts[resource] = 0;
      });

      let lastEvaluatedKey;
      do {
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey;
        }
        const result = await dynamoClient.send(new QueryCommand(params));
        if (result.Items) {
          for (const item of result.Items) {
            const pkParts = item.PK.split("#");
            if (pkParts.length >= 2) {
              const resource = pkParts[1];
              if (
                resource !== "mutation" &&
                resourceCounts.hasOwnProperty(resource)
              ) {
                resourceCounts[resource]++;
              }
            }
          }
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return resources.map((resource) => {
        const countObj: any = {};
        countObj[resource] = resourceCounts[resource];
        return countObj;
      });
    } catch (e) {
      console.error({ at: "getResourceCounts - error", error: e });
      return this.getResourceCountsFallback(resources, spaceId, dynamoClient);
    }
  }

  /**
   * Fallback method using individual queries per resource.
   * Used when GSI query approach fails.
   */
  private async getResourceCountsFallback(
    resources: Resource[],
    spaceId: string,
    dynamoClient: DynamoDBDocumentClient
  ): Promise<any[]> {
    const countPromises = resources.map(async (resource) => {
      try {
        const params = {
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `${spaceId}#${resource}`
          },
          Select: "COUNT" as const
        };

        const result = await dynamoClient.send(new QueryCommand(params));
        const countObj: any = {};
        countObj[resource] = result.Count || 0;
        return countObj;
      } catch (e) {
        console.error({ at: "getResourceCounts - error", error: e, resource });
        const countObj: any = {};
        countObj[resource] = 0;
        return countObj;
      }
    });

    return Promise.all(countPromises);
  }

  private getResourceData(item: any): any {
    const {
      PK,
      SK,
      userId,
      spaceId,
      GSI1PK,
      GSI1SK,
      action,
      timestamp,
      dapId,
      TTL,
      modifiedAtUnix,
      ...resourceData
    } = item;
    return resourceData;
  }
}

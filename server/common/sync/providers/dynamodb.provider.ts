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
  QueryCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { Select } from "@aws-sdk/client-dynamodb";

/**
 * DynamoDB Sync Provider using Single Table Design Pattern
 *
 * Table Structure:
 * - PK (Partition Key): userId#{resource} for resources, userId#mutation#{resource} for mutations
 * - SK (Sort Key): {resourceId} for actual resources, {timestamp}#{mutationId} for mutations
 *
 * Access Patterns:
 * 1. Get all resources of a type for a user: PK = "userId#resource"
 * 2. Get specific resource: PK = "userId#resource", SK = "resourceId"
 * 3. Get mutations for a resource since timestamp: PK = "userId#mutation#resource", SK > "timestamp#"
 *
 * Data Organization:
 * - Actual resource data: userId#{resource} | {resourceId} - resource attributes spread as top-level fields
 * - Mutations: userId#mutation#{resource} | {timestamp}#{mutationId} - mutation data spread as top-level fields
 * - System attributes: PK, SK, userId, action, timestamp, dapId, TTL are reserved
 * - TTL: Mutations auto-expire after 30 days
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
  TTL?: number; // For automatic deletion of old records
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
      const userId = agent.id;
      const responses = [];

      // Process mutations in batches (DynamoDB batch limit is 25)
      const batchSize = 25;
      for (let i = 0; i < mutations.length; i += batchSize) {
        const batch = mutations.slice(i, i + batchSize);
        const putRequests = [];

        // Store mutations in the mutations partition
        for (const mutation of batch) {
          const mutationItem: DynamoDBItem = {
            PK: `${spaceId}#mutation#${mutation.resource}`,
            SK: `${mutation.timestamp}#${mutation.id}`,
            userId,
            action: mutation.action,
            timestamp: mutation.timestamp,
            dapId,
            ...mutation // Spread mutation data as top-level attributes
          };

          putRequests.push({
            PutRequest: { Item: mutationItem }
          });

          // Apply the mutation to the actual resource
          const resourceMutationItem = await this.applyMutationToResource(
            mutation,
            spaceId,
            userId,
            dynamoClient
          );
          if (resourceMutationItem) {
            putRequests.push({
              PutRequest: { Item: resourceMutationItem }
            });
          }
        }

        // Batch write to DynamoDB
        if (putRequests.length > 0) {
          const params = {
            RequestItems: {
              [this.config.tableName]: putRequests
            }
          };

          await dynamoClient.send(new BatchWriteCommand(params));
        }
      }

      // Fetch updated records based on lastSyncDown
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

      // Query mutations for each resource since lastSyncDown - run in parallel
      const queryPromises = resources.map(async (resource) => {
        const params = {
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk AND SK > :lastSync",
          FilterExpression: "dapId <> :dapId",
          ExpressionAttributeValues: {
            ":pk": `${spaceId}#mutation#${resource}`,
            ":lastSync": `${lastSyncDown}#`,
            ":dapId": dapId
          },
          ScanIndexForward: false, // Sort descending by timestamp
          Limit: 100
        };

        const result = await dynamoClient.send(new QueryCommand(params));
        return { resource, result };
      });

      const queryResults = await Promise.all(queryPromises);

      // Process results from all queries
      for (const { resource, result } of queryResults) {
        if (result.Items) {
          for (const item of result.Items) {
            mutations.push(this.getResourceData(item));

            if (item.timestamp > latestTimestamp) {
              latestTimestamp = item.timestamp;
            }

            // Fetch actual records for non-delete mutations
            if (item.action !== ResourceActionType.DELETE) {
              const mutation = this.getResourceData(item);
              const recordIds = Array.isArray(mutation.resourceId)
                ? mutation.resourceId
                : [mutation.resourceId];
              for (const recordId of recordIds) {
                const recordParams = {
                  TableName: this.config.tableName,
                  Key: {
                    PK: `${spaceId}#${resource}`,
                    SK: recordId
                  }
                };

                const recordResult = await dynamoClient.send(
                  new GetCommand(recordParams)
                );
                if (recordResult.Item) {
                  records.push(this.getResourceData(recordResult.Item));
                }
              }
            } else {
              // Add to deleted array
              deleted.push(this.getResourceData(item));
            }
          }
        }
      }

      // Get resource counts
      const counts = await this.getResourceCounts(
        resources,
        spaceId,
        dynamoClient
      );

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

      // Batch write records (DynamoDB batch limit is 25)
      const batchSize = 25;
      const responses = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const putRequests = batch.map((record) => {
          const item: DynamoDBItem = {
            PK: `${spaceId}#${resource}`,
            SK: record.id,
            userId,
            timestamp: record.modifiedAt
              ? new Date(record.modifiedAt).getTime()
              : Date.now(),
            ...record // Spread record data as top-level attributes
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
      const results = [];

      for (const resource of resources) {
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

        if (result.Items) {
          const resourceData = result.Items.map((item) => {
            if (isExtension) {
              return this.getResourceData(item);
            } else {
              // Add the DynamoDB item id for non-extension clients
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

      // For DynamoDB, we'll use the LastEvaluatedKey for pagination
      // The offset here will be used as the starting key if provided
      const params: any = {
        TableName: this.config.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `${spaceId}#${resource}`
        },
        Limit: limit,
        ScanIndexForward: true
      };

      // If offset is provided, we need to find the starting point
      // For simplicity, we'll scan and skip records (not optimal for large datasets)
      if (offset > 0) {
        params.Limit = offset + limit;
      }

      const result = await dynamoClient.send(new QueryCommand(params));
      if (result.Items) {
        let items = result.Items;

        // Skip offset records if needed
        if (offset > 0) {
          items = items.slice(offset);
        }

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
  ): Promise<DynamoDBItem | null> {
    try {
      const { resource, resourceId, action, params } = mutation;

      if (!resourceId) return null;

      const resourceIds = Array.isArray(resourceId) ? resourceId : [resourceId];

      for (const rId of resourceIds) {
        const item: DynamoDBItem = {
          PK: `${spaceId}#${resource}`,
          SK: rId.toString(),
          userId,
          timestamp: mutation.timestamp
        };

        switch (action) {
          case ResourceActionType.CREATE:
          case ResourceActionType.EDIT:
            if (
              params.action === PersistenceActionType.INSERT ||
              params.action === PersistenceActionType.BULK_INSERT
            ) {
              const records = "records" in params ? params.records : [];
              const record =
                records.find((r: any) => r.id === rId) || records[0];
              if (record) {
                Object.assign(item, record); // Spread record data as top-level attributes
              }
            } else if (
              params.action === PersistenceActionType.REPLACE &&
              "record" in params
            ) {
              Object.assign(item, params.record); // Spread record data as top-level attributes
            } else if (
              params.action === PersistenceActionType.MERGE &&
              "record" in params
            ) {
              // Use atomic update instead of GET + PUT
              const updateExpressions = [];
              const expressionAttributeNames: Record<string, string> = {};
              const expressionAttributeValues: Record<string, any> = {};

              // Build update expression for each field in the record
              Object.keys(params.record).forEach((key, index) => {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                expressionAttributeNames[attrName] = key; // Direct attribute name, not nested under data
                expressionAttributeValues[attrValue] = params.record[key];
                updateExpressions.push(`${attrName} = ${attrValue}`);
              });

              const updateParams = {
                TableName: this.config.tableName,
                Key: {
                  PK: item.PK,
                  SK: item.SK
                },
                UpdateExpression: `SET ${updateExpressions.join(", ")}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                // Ensure the item exists before updating, or create it with the merge data
                ConditionExpression:
                  "attribute_exists(PK) OR attribute_not_exists(PK)"
              };

              try {
                await dynamoClient.send(new UpdateCommand(updateParams));
                return null; // No item to return for batch write since we've already updated
              } catch (error: any) {
                if (error.name === "ConditionalCheckFailedException") {
                  // Item doesn't exist, create it with the merge data
                  Object.assign(item, params.record); // Spread record data as top-level attributes
                } else {
                  throw error;
                }
              }
            }
            break;

          case ResourceActionType.DELETE:
            // For delete, we remove the item
            const deleteParams = {
              TableName: this.config.tableName,
              Key: {
                PK: item.PK,
                SK: item.SK
              }
            };

            await dynamoClient.send(new DeleteCommand(deleteParams));
            return null;
        }

        return item;
      }
    } catch (e) {
      console.error({ at: "applyMutationToResource - error", error: e });
      return null;
    }

    return null;
  }

  private async getResourceCounts(
    resources: Resource[],
    spaceId: string,
    dynamoClient: DynamoDBDocumentClient
  ): Promise<any[]> {
    const counts = [];

    for (const resource of resources) {
      try {
        const params = {
          TableName: this.config.tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `${spaceId}#${resource}`
          },
          Select: Select.COUNT
        };

        const result = await dynamoClient.send(new QueryCommand(params));
        const countObj: any = {};
        countObj[resource] = result.Count || 0;
        counts.push(countObj);
      } catch (e) {
        console.error({ at: "getResourceCounts - error", error: e, resource });
        const countObj: any = {};
        countObj[resource] = 0;
        counts.push(countObj);
      }
    }

    return counts;
  }

  // Helper function to extract system attributes from an item
  private getSystemAttributes(item: any): Partial<DynamoDBItem> {
    const { PK, SK, userId, action, timestamp, dapId, TTL } = item;
    return { PK, SK, userId, action, timestamp, dapId, TTL };
  }

  // Helper function to extract resource data (excluding system attributes)
  private getResourceData(item: any): any {
    const { PK, SK, userId, action, timestamp, dapId, TTL, ...resourceData } =
      item;
    return resourceData;
  }
}

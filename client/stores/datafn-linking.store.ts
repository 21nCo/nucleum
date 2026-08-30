import { Resource } from "@21n/data/datafn/resource.enum";
import { determineResourceType } from "@21n/data/datafn/resource.utils";
import { datafn, datafnRuntime } from "@21n/stores/datafn.store";
import type { IRecordId } from "@21n/types/data.type";
import { get } from "svelte/store";

type DatafnRelationSource = {
  id: string;
  resource: Resource;
};

function isCollectionItemResource(resource: Resource) {
  return resource === Resource.node || resource === Resource.objective;
}

function isLinkableResource(resource: Resource) {
  return (
    resource === Resource.node ||
    resource === Resource.objective ||
    resource === Resource.task ||
    resource === Resource.event
  );
}

function assertMutationSucceeded(result: unknown) {
  if (!result) throw new Error("DataFn relation mutation failed");
  if (
    typeof result === "object" &&
    "ok" in result &&
    (result as { ok?: unknown }).ok === false
  ) {
    throw (
      (result as { error?: unknown }).error ??
      new Error("DataFn relation mutation failed")
    );
  }
}

function assertRelationSelection(
  targetResource: Resource,
  sources: DatafnRelationSource[]
) {
  if (targetResource === Resource.collection) {
    if (sources.some((source) => !isCollectionItemResource(source.resource))) {
      throw new Error(
        "The selection contains records that cannot be collected"
      );
    }
    return;
  }
  if (
    !isLinkableResource(targetResource) ||
    sources.some((source) => !isLinkableResource(source.resource))
  ) {
    throw new Error("The selection contains records that cannot be linked");
  }
}

function resolveRelationMutation(input: {
  source: DatafnRelationSource;
  targetId: string;
  targetResource: Resource;
  context?: unknown;
}) {
  return {
    resource: input.source.resource.toString(),
    version: 1,
    operation: "relate",
    id: input.source.id,
    relations:
      input.targetResource === Resource.collection
        ? {
            collections: [
              {
                $ref: input.targetId,
                fromResource: input.source.resource.toString()
              }
            ]
          }
        : {
            links: [
              {
                $ref: input.targetId,
                fromResource: input.source.resource.toString(),
                toResource: input.targetResource.toString()
              }
            ]
          },
    context: input.context
  };
}

async function resolvePendingRelationSources(input: {
  sources: DatafnRelationSource[];
  targetId: string;
  relationName: string;
}) {
  const pendingSources: DatafnRelationSource[] = [];
  for (const source of input.sources) {
    const existing = await datafn
      .table(source.resource)
      .relation(input.relationName)
      .query(source.id, { select: ["id"] });
    if (!existing.data.some((record) => record.id === input.targetId)) {
      pendingSources.push(source);
    }
  }
  return pendingSources;
}

/**
 * Relates validated records through the DataFn schema and rejects partial batches.
 */
export async function relateDatafnRecords(input: {
  sourceIds: IRecordId[];
  targetId: IRecordId;
  context?: unknown;
}) {
  if (input.sourceIds.length === 0) {
    throw new Error("Select at least one record to link");
  }
  const targetResource = determineResourceType(input.targetId);
  const sources = input.sourceIds.map((sourceId) => ({
    id: sourceId.toString(),
    resource: determineResourceType(sourceId)
  }));
  assertRelationSelection(targetResource, sources);

  const relationName =
    targetResource === Resource.collection ? "collections" : "links";
  const targetId = input.targetId.toString();
  const pendingSources = await resolvePendingRelationSources({
    sources,
    targetId,
    relationName
  });
  if (pendingSources.length > 0) {
    const mutations = pendingSources.map((source) =>
      resolveRelationMutation({
        source,
        targetId,
        targetResource,
        context: input.context
      })
    );
    const runtime = get(datafnRuntime);
    if (!runtime) throw new Error("DataFn runtime is not initialized");
    if (runtime.mode === "local-only") {
      const results = await datafn.mutate(mutations);
      if (!Array.isArray(results) || results.length !== mutations.length) {
        throw new Error("DataFn relation mutation batch failed");
      }
      results.forEach(assertMutationSucceeded);
    } else {
      const result = await datafn.transact({
        atomic: true,
        steps: mutations.map((mutation) => ({ mutation }))
      });
      assertMutationSucceeded(result);
    }
  }
  return sources.length;
}

/**
 * Adds one supported record to a collection through the shared linking policy.
 */
export async function addDatafnRecordToCollection(input: {
  sourceId: IRecordId;
  collectionId: IRecordId;
  context?: unknown;
}) {
  return relateDatafnRecords({
    sourceIds: [input.sourceId],
    targetId: input.collectionId,
    context: input.context
  });
}

import { Resource } from "@21n/data/datafn/resource.enum";
import { determineResourceType } from "@21n/data/datafn/resource.utils";
import { datafn } from "@21n/stores/datafn.store";
import type { IRecordId } from "@21n/types/data.type";

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
  if (targetResource === Resource.collection) {
    if (sources.some((source) => !isCollectionItemResource(source.resource))) {
      throw new Error(
        "The selection contains records that cannot be collected"
      );
    }
  } else if (
    !isLinkableResource(targetResource) ||
    sources.some((source) => !isLinkableResource(source.resource))
  ) {
    throw new Error("The selection contains records that cannot be linked");
  }

  const relationName =
    targetResource === Resource.collection ? "collections" : "links";
  const targetId = input.targetId.toString();
  const resolveMutation = (
    source: (typeof sources)[number],
    operation: "relate" | "unrelate"
  ) => ({
    operation,
    id: source.id,
    relations:
      targetResource === Resource.collection
        ? {
            collections: [
              {
                $ref: targetId,
                fromResource: source.resource.toString()
              }
            ]
          }
        : {
            links: [
              {
                $ref: targetId,
                fromResource: source.resource.toString(),
                toResource: targetResource.toString()
              }
            ]
          },
    context: input.context
  });
  const pendingSources: typeof sources = [];
  for (const source of sources) {
    const existing = await datafn
      .table(source.resource)
      .relation(relationName)
      .query(source.id, { select: ["id"] });
    if (!existing.data.some((record) => record.id === targetId)) {
      pendingSources.push(source);
    }
  }

  const appliedSources: typeof sources = [];
  try {
    for (const source of pendingSources) {
      const result = await datafn
        .table(source.resource)
        .mutate(resolveMutation(source, "relate") as any);
      assertMutationSucceeded(result);
      appliedSources.push(source);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const source of appliedSources.reverse()) {
      try {
        const result = await datafn
          .table(source.resource)
          .mutate(resolveMutation(source, "unrelate") as any);
        assertMutationSucceeded(result);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "DataFn relation mutation and rollback failed"
      );
    }
    throw error;
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

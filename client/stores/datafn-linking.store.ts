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

  const results = await Promise.all(
    sources.map((source) =>
      datafn.table(source.resource).mutate({
        operation: "relate",
        id: source.id,
        relations:
          targetResource === Resource.collection
            ? {
                collections: [
                  {
                    $ref: input.targetId.toString(),
                    fromResource: source.resource.toString()
                  }
                ]
              }
            : {
                links: [
                  {
                    $ref: input.targetId.toString(),
                    fromResource: source.resource.toString(),
                    toResource: targetResource.toString()
                  }
                ]
              },
        context: input.context
      } as any)
    )
  );
  results.forEach(assertMutationSucceeded);
  return results.length;
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

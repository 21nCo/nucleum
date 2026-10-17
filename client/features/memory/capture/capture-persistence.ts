import { Resource } from "@nucleum/datafn/resource.enum";
import { LinkType } from "@nucleum/datafn/link.type";
import { type INodeCapture } from "@nucleum/features/memory/node/node.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { logger } from "@nucleum/client/runtime/logging/logger";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { type ICollectionItemPropertyValue } from "@nucleum/features/collections/collection.type";
import { determineResourceType } from "@nucleum/datafn/resource.utils";
import context from "@nucleum/client/runtime/context.store";
import { datafn } from "@nucleum/datafn/datafn.store";

type CaptureRelationMutation = {
  operation: "relate";
  id: IRecordId;
  relations: Record<string, unknown>;
  context?: string;
};

function isRecordLinkResource(resource: Resource) {
  return (
    resource === Resource.node ||
    resource === Resource.objective ||
    resource === Resource.task ||
    resource === Resource.event
  );
}

function isCollectionItemResource(resource: Resource) {
  return resource === Resource.node || resource === Resource.objective;
}

/** Persists captured links through the owning DataFn relations. */
export async function persistContentLinks(links: any[] = []) {
  return Promise.all(
    links.map((link) => {
      const fromResource = determineResourceType(link.in);
      const toResource = determineResourceType(link.out);
      if (
        toResource === Resource.collection &&
        isCollectionItemResource(fromResource)
      ) {
        return datafn.table(fromResource).mutate({
          operation: "relate",
          id: link.in.toString(),
          relations: {
            collections: [
              {
                $ref: link.out.toString(),
                fromResource: fromResource.toString(),
                location: link.location
              }
            ]
          }
        } as any);
      }
      if (
        fromResource === Resource.collection &&
        isCollectionItemResource(toResource)
      ) {
        return datafn.collection.mutate({
          operation: "relate",
          id: link.in.toString(),
          relations: {
            items: [
              {
                $ref: link.out.toString(),
                fromResource: toResource.toString(),
                location: link.location
              }
            ]
          }
        } as any);
      }
      if (
        !isRecordLinkResource(fromResource) ||
        !isRecordLinkResource(toResource)
      ) {
        logger.warn({
          at: "CaptureStore.persistContentLinks.unsupportedRelation",
          from: link.in,
          out: link.out,
          fromResource,
          toResource
        });
        return undefined;
      }
      return datafn.table(fromResource).mutate({
        operation: "relate",
        id: link.in.toString(),
        relations: {
          links: [
            {
              $ref: link.out.toString(),
              fromResource: fromResource.toString(),
              toResource: toResource.toString(),
              linkType: link.linkType ?? LinkType.DIRECT,
              location: link.location,
              tags: link.tags
            }
          ]
        }
      } as any);
    })
  );
}

/** Inserts captured nodes and their associated collection/property relations. */
export async function insertCapturedNodes(
  input: INodeCapture<any> | INodeCapture<any>[],
  params?: { context?: string }
) {
  function resolveMarkdownParentFields(mdParent: unknown) {
    if (!Array.isArray(mdParent)) return {};
    const parents = mdParent.filter(
      (parent): parent is IRecordId => typeof parent === "string"
    );
    const parent = parents[parents.length - 1];
    if (!parent) return {};
    return {
      parent,
      parentPath: parents.join("-")
    };
  }
  const nodes = (Array.isArray(input) ? input : [input]).map((node) => ({
    metaType: "",
    contentType: NodeType.UNKNOWN,
    ...node,
    id: node.id ?? generateResourceId(Resource.node)
  }));
  await datafn.node.mutate(
    nodes.map((node) => {
      const { collections, propertyValues, ...record } =
        node as INodeCapture<any> & {
          collections?: IRecordId[];
          propertyValues?: ICollectionItemPropertyValue[];
        };
      return {
        operation: "insert",
        id: record.id,
        record: {
          ...record,
          ...resolveMarkdownParentFields(record.mdParent)
        },
        context: params?.context
      };
    })
  );
  const relationMutations = nodes
    .map((node): CaptureRelationMutation | undefined => {
      const relations: Record<string, unknown> = {};
      const collections =
        (node as { collections?: IRecordId[] }).collections ?? [];
      const propertyValues =
        (node as { propertyValues?: ICollectionItemPropertyValue[] })
          .propertyValues ?? [];
      if (collections.length > 0) {
        relations.collections = collections.map((id) => ({
          $ref: id.toString(),
          fromResource: Resource.node
        }));
      }
      if (propertyValues.length > 0) {
        relations.propertyValues = propertyValues.map((property) => ({
          $ref: property.id.toString(),
          fromResource: Resource.node,
          collectionId: property.collectionId,
          value: property.value
        }));
      }
      if (Object.keys(relations).length === 0) return undefined;
      return {
        operation: "relate",
        id: node.id,
        relations,
        context: params?.context
      };
    })
    .filter((mutation): mutation is CaptureRelationMutation =>
      Boolean(mutation)
    );
  if (relationMutations.length > 0) {
    await datafn.node.mutate(relationMutations as any);
  }
  return nodes.map((node) => ({
    ...node,
    updatedAt: "updatedAt" in node ? node.updatedAt : new Date()
  }));
}

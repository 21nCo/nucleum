import type { DfqlRelations } from "@datafn/core";
import { DatafnExtensionMethod } from "@nucleum/extensions/extension.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { extensionDatafn } from "@nucleum/extensions/extension.store";
import { Resource } from "@nucleum/datafn/resource.enum";
import type { OmitForCaptureWithId } from "@nucleum/datafn/resource.type";
import { determineResourceType } from "@nucleum/datafn/resource.utils";
import { LinkType } from "@nucleum/datafn/link.type";
import { type INode, type INodePropertyValue } from "@nucleum/features/memory/node/node.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

export async function queryOutgoingLinkIdsBySource(sourceIds: IRecordId[]) {
  if (sourceIds.length === 0) return new Map<string, IRecordId[]>();
  const records = await extensionDatafn({
    method: DatafnExtensionMethod.SELECT_MANY,
    args: {
      resource: Resource.node,
      params: {
        filters: {
          id: { $in: sourceIds }
        },
        select: ["id", "links.#"]
      }
    }
  });
  return new Map(
    (records ?? []).map((record: any) => [
      record.id.toString(),
      (record.links ?? [])
        .map((row: any) => row.to ?? row.out ?? row.id)
        .filter(Boolean)
    ])
  );
}

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

export async function relateRecord(
  from: IRecordId,
  to: IRecordId,
  params?: {
    linkType?: LinkType;
    tags?: IRecordId[];
    location?: string;
  }
) {
  const fromResource = determineResourceType(from);
  const toResource = determineResourceType(to);
  if (toResource === Resource.collection) {
    if (!isCollectionItemResource(fromResource)) return undefined;
    return extensionDatafn({
      method: DatafnExtensionMethod.MUTATION,
      args: {
        resource: fromResource,
        params: {
          operation: "relate",
          id: from.toString(),
          relations: {
            collections: [
              {
                $ref: to.toString(),
                fromResource: fromResource.toString()
              }
            ]
          }
        } as any
      }
    });
  }
  if (!isLinkableResource(fromResource) || !isLinkableResource(toResource)) {
    return undefined;
  }
  return extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: fromResource,
      params: {
        operation: "relate",
        id: from.toString(),
        relations: {
          links: [
            {
              $ref: to.toString(),
              fromResource: fromResource.toString(),
              toResource: toResource.toString(),
              linkType: params?.linkType ?? LinkType.DIRECT,
              tags: params?.tags,
              location: params?.location
            }
          ]
        }
      } as any
    }
  });
}

export async function unrelateRecord(from: IRecordId, to: IRecordId) {
  const fromResource = determineResourceType(from);
  const toResource = determineResourceType(to);
  if (toResource === Resource.collection) {
    if (!isCollectionItemResource(fromResource)) return undefined;
    return extensionDatafn({
      method: DatafnExtensionMethod.MUTATION,
      args: {
        resource: fromResource,
        params: {
          operation: "unrelate",
          id: from.toString(),
          relations: {
            collections: [to.toString()]
          }
        } as any
      }
    });
  }
  if (!isLinkableResource(fromResource)) return undefined;
  return extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: fromResource,
      params: {
        operation: "unrelate",
        id: from.toString(),
        relations: {
          links: [to.toString()]
        }
      } as any
    }
  });
}

export async function insertNodeRecords(
  input: OmitForCaptureWithId<INode> | OmitForCaptureWithId<INode>[]
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
  await extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: Resource.node,
      params: nodes.map((node) => {
        const { children, collections, links, propertyValues, ...record } =
          node as OmitForCaptureWithId<INode> & {
            children?: IRecordId[];
            collections?: IRecordId[];
            links?: IRecordId[];
            propertyValues?: INodePropertyValue[];
          };
        if (typeof record.parent !== "string") {
          delete record.parent;
        }
        return {
          operation: "insert",
          id: record.id,
          record: {
            ...record,
            ...resolveMarkdownParentFields(record.mdParent)
          }
        };
      }) as any
    }
  });
  const relationMutations = nodes
    .map((node) => {
      const relations: DfqlRelations = {};
      const collections =
        (node as { collections?: IRecordId[] }).collections ?? [];
      const links = (node as { links?: IRecordId[] }).links ?? [];
      const propertyValues =
        (node as { propertyValues?: INodePropertyValue[] }).propertyValues ??
        [];
      if (collections.length > 0) {
        relations.collections = collections.map((id) => ({
          $ref: id.toString(),
          fromResource: Resource.node
        }));
      }
      if (links.length > 0) {
        relations.links = links
          .filter((id) => isLinkableResource(determineResourceType(id)))
          .map((id) => ({
            $ref: id.toString(),
            fromResource: Resource.node,
            toResource: determineResourceType(id).toString(),
            linkType: LinkType.DIRECT
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
        relations
      };
    })
    .filter(Boolean);
  if (relationMutations.length > 0) {
    await extensionDatafn({
      method: DatafnExtensionMethod.MUTATION,
      args: {
        resource: Resource.node,
        params: relationMutations as any
      }
    });
  }
  return nodes.map((node) => ({
    ...node,
    updatedAt: "updatedAt" in node ? node.updatedAt : new Date()
  }));
}

export function mergeNodeRecord(id: IRecordId, record: Partial<INode>) {
  return extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: Resource.node,
      params: {
        operation: "merge",
        id,
        record
      } as any
    }
  });
}

export function trashNodeRecord(id: IRecordId) {
  return extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: Resource.node,
      params: {
        operation: "trash",
        id
      } as any
    }
  });
}

export function updateNodePropertyValues(
  id: IRecordId,
  propertyValues: INodePropertyValue[]
) {
  return extensionDatafn({
    method: DatafnExtensionMethod.MUTATION,
    args: {
      resource: Resource.node,
      params: {
        operation: "relate",
        id,
        relations: {
          propertyValues: propertyValues.map((property) => ({
            $ref: property.id.toString(),
            fromResource: Resource.node,
            collectionId: property.collectionId,
            value: property.value
          }))
        }
      } as any
    }
  });
}

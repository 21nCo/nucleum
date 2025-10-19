import { flux } from "@21n/components/flux/flux";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "@21n/types/data.type";
import { type INode, NodeType } from "@21n/products/memotron/node/node.type";

export function migrateTo0_56_0() {}

export async function defaultsMigrationForNodes() {
  const nodes = await flux.selectMany(Resource.node);
  const nodesWithoutContentType = nodes.filter((x: INode) => !x.contentType);
  console.log({ at: "defaultsMigrationForNodes", nodesWithoutContentType });
  if (nodesWithoutContentType.length) {
    await flux.mutation<INode>(Resource.node, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: nodesWithoutContentType.map((x: INode) => x.id),
      changes: {
        contentType: NodeType.UNKNOWN
      }
    });
  }
  const nodesWithoutMetaType = nodes.filter(
    (x: INode) => !x.metaType && x.metaType !== ""
  );
  console.log({
    at: "defaultsMigrationForNodes",
    nodesWithoutMetaTypeLength: nodesWithoutMetaType.length
  });
  if (nodesWithoutMetaType.length) {
    for (let i = 0; i < nodesWithoutMetaType.length; i += 50) {
      const batch = nodesWithoutMetaType.slice(i, i + 50);
      await flux.mutation<INode>(Resource.node, {
        action: PersistenceActionType.BULK_MERGE,
        recordIds: batch.map((x: INode) => x.id),
        changes: {
          metaType: ""
        }
      });
    }
  }
}

import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "$lib/client/types/data.type";
import { type INode, NodeType } from "../node/node.type";

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
    for (let i = 0; i < nodesWithoutMetaType.length; i += 500) {
      const batch = nodesWithoutMetaType.slice(i, i + 500);
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

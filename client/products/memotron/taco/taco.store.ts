import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { get } from "svelte/store";
import { nodeStore, vectorResourceStore } from "../node/node.store";
import { NodeType } from "../node/node.type";
import { TacoActions } from "./taco.types";

export async function verifyVectorGenerationTransactionNUpdate(
  isRegenerateForAll: boolean = false
) {
  if (
    !get(userPreferences).localAI.semanticSearch ||
    !get(userPreferences).localAI.vectorGenerationInProgress
  )
    return;

  let nodes;
  if (isRegenerateForAll) {
    nodes = await nodeStore.selectMany({
      filters: {
        contentType: [
          NodeType.NODULAR_MARKDOWN,
          NodeType.HEADING1,
          NodeType.HEADING2,
          NodeType.HEADING3,
          NodeType.HEADING4,
          NodeType.HEADING5
        ]
      }
    });
    const vectors = await vectorResourceStore.selectMany();
    for (let vector of vectors) {
      await vectorResourceStore.delete(vector.id);
    }
  } else
    nodes = await nodeStore.selectMany({
      filters: {
        contentType: [
          NodeType.NODULAR_MARKDOWN,
          NodeType.HEADING1,
          NodeType.HEADING2,
          NodeType.HEADING3,
          NodeType.HEADING4,
          NodeType.HEADING5
        ],
        vector: false
      }
    });

  if (nodes.length > 0) {
    userPreferences.modify({
      localAI: {
        ...get(userPreferences).localAI,
        vectorGenerationInProgress: true
      }
    });
    const semanticSearchWorker = new Worker(
      new URL(
        "$lib/client/products/memotron/taco/taco.worker.ts",
        import.meta.url
      ),
      { type: "module" }
    );
    semanticSearchWorker.postMessage({
      action: TacoActions.GEN_EMBEDDINGS_AND_RETURN_PROCESSED_DATA,
      params: { nodes: nodes }
    });
    semanticSearchWorker.onmessage = async (e) => {
      if (e.data.params) {
        const { vectorRecords, updatedNodes } = e.data.params;
        const resp = await vectorResourceStore.create(vectorRecords);
        // const noderesp = await flux.mutation<T>(Resource.node, {
        //   action: PersistenceActionType.BULK_MERGE,
        //   records: updatedNodes
        // });
        /**
         * the current bulkmodify applies the same value to all nodes, here the requirement for bulkmodify is different values for different nodes. until that store modifcation is done utilizing this temporarily.
         */
        for (let node of updatedNodes) {
          let id = `${node.id.tb}:${node.id.id}`;
          const noderesp = await nodeStore.modify(id, {
            vector: node.vector
          });
        }
      }
      userPreferences.modify({
        localAI: {
          ...get(userPreferences).localAI,
          vectorGenerationInProgress: false
        }
      });
      semanticSearchWorker.terminate();
    };
  } else {
    userPreferences.modify({
      localAI: {
        ...get(userPreferences).localAI,
        vectorGenerationInProgress: false
      }
    });
  }
}

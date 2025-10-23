import { userPreferences } from "@21n/components/settings/userPreferences.store";
import { get } from "svelte/store";
import { nodeStore, vectorResourceStore } from "@21n/products/memotron/node/node.store";
import { NodeType } from "@21n/products/memotron/node/node.type";
import { TacoActions } from "@21n/products/memotron/taco/taco.types";
import { tacoWorker } from "@21n/products/memotron/memotron.utils";
import { Embed, OperatingSystem } from "@21n/types/context.type";
import context from "@21n/stores/context.store";
import { deleteAllLocalModels } from "@21n/products/memotron/taco/taco.utils";

const dev_isEnableSemanticSearch = false;

export async function initializeTaco() {
  try {
    const userPref = get(userPreferences);
    const ctx = get(context);
    if (ctx.os === OperatingSystem.IOS) {
      await deleteAllLocalModels();
      return;
    }
    if (dev_isEnableSemanticSearch && userPref.localAI.semanticSearch) {
      tacoWorker.postMessage({
        action: TacoActions.INITIALIZE_FEATURE_EXTRACTOR
      });
      tacoWorker.onmessage = (e) => {
        if (e.data.status == "ready") {
          console.log("semantic model initialized");
          runVectorGeneration();
        }
      };
    }
    if (userPref.localAI.audioTranscription) {
      tacoWorker.postMessage({
        action: TacoActions.INITIALIZE_TRANSCRIBER
      });
    }
  } catch (error) {
    console.error("initializeTaco", error);
  }
}

export async function runVectorGeneration(isRegenerateForAll: boolean = false) {
  try {
    const userPref = get(userPreferences);
    if (
      !dev_isEnableSemanticSearch ||
      !userPref.localAI.semanticSearch ||
      get(context).embed === Embed.HANDSET ||
      userPref.localAI.vectorGenerationInProgress === true
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

    console.log("nodes without vector: ", nodes.length);
    if (nodes.length === 0) return;
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
      semanticSearchWorker.terminate();
    };
  } catch (error) {
    console.error("verifyVectorGenerationTransactionNUpdate", error);
  } finally {
    userPreferences.modify({
      localAI: {
        ...get(userPreferences).localAI,
        vectorGenerationInProgress: false
      }
    });
  }
}

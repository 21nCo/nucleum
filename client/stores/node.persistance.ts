import { Cloud } from "$lib/client/types/cloud.enum";
import { get } from "svelte/store";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import type { INodeCapture } from "../types/memotron/node.type";
import { formatDate } from "$lib/client/utils/time.utils";
import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import { cloudProvider } from "./persistance";

const surrealDb = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);

export class NodePersistance {
  /**
   * ! Deprecated
   * nodes.create store in combination with dataManager performMutation is used instead.
   * @param node
   * @returns
   */
  async save(node: INodeCapture) {
    switch (get(cloudProvider) as Cloud) {
      case Cloud.local:
      //
      case Cloud.surreal: {
        let response = await surrealDb.query(
          "return fn::memotron::node::save($node, $links);",
          {
            node,
            links: node.links ?? []
          }
        );
        return interceptSurrealResponse(response, "save node");
      }
      default:
        return null;
    }
  }
  async searchForLinking(query: string) {
    switch (get(cloudProvider) as Cloud) {
      case Cloud.local:
      //
      case Cloud.surreal: {
        let response = await surrealDb.query(
          "return fn::memotron::searchLinks($query);",
          {
            query
          }
        );
        return interceptSurrealResponse(response, "search links");
      }
      default:
        return null;
    }
  }
  async fetchTimeline(date: Date) {
    const query = `fn::memotron::timeline($date)`;
    const response = await surrealDb.query(query, {
      date: formatDate(date, "iso")
    });
    return interceptSurrealResponse(response, "fetch timeline");
  }
  async fetch(nodeId: string) {
    const query = `fn::memotron::node::fetch($nodeId)`;
    const response = await surrealDb.executeReadFn(query, { nodeId });
    return interceptSurrealResponse(response, "fetch node");
  }
}

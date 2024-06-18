import { Cloud } from "$lib/client/types/cloud.enum";
import { get } from "svelte/store";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { formatDate } from "$lib/client/utils/time.utils";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { cloudProvider } from "../../../persistence/persistence";
import { ResourcePersistence } from "../../../persistence/resource.persistence";
import { Item } from "../../../types/item.enum";
import type { INodeCapture, LinkType } from "../../../types/memotron/node.type";
import type { IMutationQueueParams } from "../../../types/data.type";

const surrealDb = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);

export class NodePersistence extends ResourcePersistence {
  constructor(userId: string) {
    super(Item.node, userId);
  }
  createNode(
    capture: INodeCapture,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    return super.create(
      capture,
      "return fn::memotron::node::createMany($resources, $mutatedAt);",
      mutatationQueueParams
    );
  }
  /**
   * @deprecated
   * @param query
   * @returns
   */
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

  async link(from: string, to: string, linkType: LinkType) {
    let response = await surrealDb.query(
      "return fn::memotron::link($from, $to, $linkType);",
      {
        from,
        to,
        linkType
      }
    );
    return interceptSurrealResponse(response, "link");
  }
}

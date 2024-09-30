import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import type { ILinkTag } from "./link.type";
import {
  type IRecordId,
  PersistenceActionType
} from "$lib/client/types/data.type";
import { replaceParams } from "$lib/client/persistence/surreal/surreal.utils";
import {
  LinkType,
  type INodeLink
} from "$lib/client/products/memotron/node/node.type";
import { flux } from "$lib/client/components/flux/flux";
import { logger } from "$lib/client/components/debug/logger.client";
import { activeResourceFilter } from "$lib/client/utils/utils";
import { get } from "svelte/store";
import { linkTagLabelMapper } from "./link.utils";

class Linker extends ResourceStore<INodeLink> {
  constructor() {
    super(Resource.link);
  }

  async link(
    from: IRecordId,
    to: IRecordId,
    linkType: LinkType = LinkType.DIRECT
  ) {
    const response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query: this.generateLinkQuery(from, to, linkType)
    });
    logger.log({ at: "link", response });
    return response;
  }

  async unlink(from: IRecordId, to: IRecordId) {
    let response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query:
        "DELETE $from->link where out=$to; DELETE $to->link where out=$from;",
      data: {
        from,
        to
      }
    });
    logger.log({ at: "unlink", from, to, response });
    return response;
  }

  async linkMany(links: any[]) {
    const query = links
      .map((link) => this.generateLinkQuery(link.from, link.to, link.linkType))
      .join("; ");
    let response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query
    });
    logger.log({ at: "linkMany", response });
    return response;
  }

  private generateLinkQuery(from: IRecordId, to: IRecordId, linkType: string) {
    return replaceParams(
      `relate $from->link->$to content {toType: meta::tb($to), linkType: $linkType, createdAt: time::now()}`,
      {
        from,
        to,
        linkType
      }
    );
  }

  /**
   * Queries links along with other node properties for a list of nodes.
   * @param nodes
   * @returns
   */
  async getLinksForNodes(nodes: IRecordId[]) {
    const result = await flux.selectMany(Resource.node, {
      properties: ["*", "array::concat(->link.*, <-link.*) as links"],
      filters: {
        id: nodes.map((x) => x.toString())
      }
    });
    return result;
  }

  get() {}
}

export const linker = new Linker();

class LinkTagStore extends ResourceStore<ILinkTag> {
  constructor() {
    super(Resource.linkTag, {
      isInMemory: true
    });
  }

  save(tag: string, group?: string) {
    if (!group && tag.includes(":")) {
      group = tag.split(":")[0];
      tag = tag.split(":")[1];
    }
    const result = this.create({
      label: tag,
      group: group?.toLowerCase() ?? ""
    });
    return result;
  }

  transform(data: ILinkTag[]) {
    const groupsArray = data.reduce(
      (acc, item) => {
        const group = item.group ?? "";
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(item);
        return acc;
      },
      {} as Record<string, ILinkTag[]>
    );
    const groups = Object.entries(groupsArray).map(([group, items]) => ({
      group,
      items: items.filter(activeResourceFilter)
    }));
    const withoutGroup = groups.find((x) => x.group === "");
    return [withoutGroup, ...groups.filter((x) => x.group !== "")];
  }

  search(query: string) {
    return get(this.items)
      .map(linkTagLabelMapper)
      .filter((x) => x.label?.toLowerCase().includes(query.toLowerCase()));
  }
}

export const linkTagStore = new LinkTagStore();

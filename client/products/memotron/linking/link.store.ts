import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import type { ILinkTag } from "./link.type";
import { StoreDataType, type IRecordId } from "$lib/client/types/data.type";
import { replaceParams } from "$lib/shared/utils/surreal.utils";
import {
  LinkType,
  type INodeLink
} from "$lib/client/products/memotron/node/node.type";
import { logger } from "$lib/client/components/debug/logger.client";
import { activeResourceFilter } from "$lib/client/utils/utils";
import { get } from "svelte/store";
import { linkTagLabelMapper } from "./link.utils";
import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import type { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceError } from "$lib/client/components/error/errors";
import { ResourceErrorCode } from "$lib/client/components/error/error.type";

class Linker extends ResourceStore<INodeLink> {
  constructor() {
    super(Resource.link);
  }

  async link(
    from: IRecordId,
    to: IRecordId,
    params?: {
      linkType?: LinkType;
      content?: any;
      context?: string;
    }
  ) {
    if (params?.linkType !== LinkType.MENTION) {
      const existing = await this.selectMany({
        filters: {
          in: from.toString(),
          out: to.toString(),
          linkType: params?.linkType ?? LinkType.DIRECT
        }
      });
      if (isValidArrayWithData(existing)) {
        throw new ResourceError(
          "Link already exists",
          ResourceErrorCode.ALREADY_EXISTS
        );
      }
    }
    const response = await this.create(
      {
        in: from,
        out: to,
        linkType: params?.linkType ?? LinkType.DIRECT,
        ...(params?.content ?? {})
      },
      {
        context: params?.context
      }
    );
    logger.log({ at: "link", response });
    return response;
  }

  async unlink(
    from: IRecordId,
    to: IRecordId,
    params?: {
      linkType?: LinkType;
      isIncludeReverseDirection?: boolean;
      context?: string;
    }
  ) {
    logger.log({ at: "unlink", from, to });
    const links = await this.selectMany({
      filters: {
        in: from.toString(),
        out: to.toString(),
        ...(params?.linkType ? { linkType: params.linkType } : {})
      }
    });
    let reverseDirectionLinks: INodeLink[] = [];
    if (params?.isIncludeReverseDirection) {
      reverseDirectionLinks = await this.selectMany({
        filters: {
          out: from.toString(),
          in: to.toString(),
          ...(params?.linkType ? { linkType: params.linkType } : {})
        }
      });
    }
    const allIds = [...(links ?? []), ...(reverseDirectionLinks ?? [])].map(
      (x) => x.id
    );
    if (allIds.length < 1) return true;
    const response = await this.deleteMany(allIds, {
      context: params?.context
    });
    logger.log({ at: "unlink", allIds, response });
    return !response?.error;
  }

  /**
   * Deletes links of direct linking type.
   *
   * Used for bulk unlinking in nodes page - direct links
   * and removing many nodes from a collection.
   *
   * @param items
   * @param accessPointId
   * @returns
   */
  async bulkUnlinkForDirect(items: IRecordId[], accessPointId: IRecordId) {
    const links = await this.selectMany({
      filters: {
        in: items.map((x) => x.toString()),
        out: accessPointId.toString(),
        linkType: LinkType.DIRECT
      }
    });
    const resourceType = determineResourceType(accessPointId);
    let reverseDirectionLinks: INodeLink[] = [];
    if (resourceType === Resource.node) {
      reverseDirectionLinks = await this.selectMany({
        filters: {
          out: items.map((x) => x.toString()),
          in: accessPointId.toString(),
          linkType: LinkType.DIRECT
        }
      });
    }
    logger.log({
      at: "bulkUnlinkForDirect",
      links,
      reverseDirectionLinks
    });
    if (
      isValidArrayWithData(links) ||
      isValidArrayWithData(reverseDirectionLinks)
    ) {
      const allIds = [...(links ?? []), ...(reverseDirectionLinks ?? [])].map(
        (x) => x.id
      );
      logger.log({ at: "bulkUnlinkForDirect", allIds });
      return this.deleteMany(allIds);
    }
    return true;
  }

  async linkMany(links: any[], context?: ResourceAccessPoint) {
    const response = await this.create(links, {
      context
    });
    logger.log({ at: "linkMany", links, response });
    return response;
  }

  async bulkLink(
    items: IRecordId[],
    to: IRecordId,
    toType: Resource,
    params?: {
      context?: ResourceAccessPoint;
      importId?: string;
    }
  ) {
    const links = items.map((item) => {
      return {
        in: item,
        out: to,
        toType,
        linkType: LinkType.DIRECT,
        ...(params?.importId ? { importId: params.importId } : {})
      };
    });
    const response = await this.linkMany(links, params?.context);
    logger.log({ at: "bulkLink", items, to, response });
    return response;
  }

  /**
   * @deprecated - using direct insert instead
   * @param from
   * @param to
   * @param linkType
   * @returns
   */
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

  get() {}
}

export const linker = new Linker();

class LinkTagStore extends ResourceStore<ILinkTag> {
  constructor() {
    super(Resource.linkTag, {
      isInMemory: true,
      dataType: StoreDataType.FIR
    });
  }

  async save(tag: string, group?: string) {
    if (!group && tag.includes(":")) {
      group = tag.split(":")[0];
      tag = tag.split(":")[1];
    }
    const linkTags = get(this.items);
    const existingTag = linkTags.find(
      (x) =>
        x.label?.toLowerCase() === tag.toLowerCase() &&
        x.group?.toLowerCase() === group?.toLowerCase()
    );
    if (existingTag) return existingTag;
    const result = this.create({
      label: tag,
      group: group?.toLowerCase() ?? ""
    });
    return result;
  }

  transform(data: ILinkTag[]) {
    const groupsArray = data?.reduce(
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
    return [withoutGroup, ...groups.filter((x) => x.group !== "")].filter(
      (x) => x
    );
  }

  search(query: string) {
    return get(this.items)
      .map(linkTagLabelMapper)
      .filter((x) => x.label?.toLowerCase().includes(query.toLowerCase()));
  }
}

export const linkTagStore = new LinkTagStore();

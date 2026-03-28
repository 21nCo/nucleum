import type { ICollection } from "@21n/components/collection/collection.type";
import { logger } from "@21n/components/debug/logger.client";
import { flux } from "@21n/components/flux/flux";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import {
  determineResourceType,
  isSameResource,
  removeDuplicatesFilter,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import {
  PersistenceActionType,
  type IRecordId
} from "@21n/types/data.type";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
import { headingNodeTypes, NodeType, type INode } from "@21n/products/memotron/node/node.type";
import type { ILinkThumb } from "@21n/products/memotron/linking/link.type";

type IMemotronNode = INode & {
  avatar?: unknown;
  collections?: IRecordId[];
  mdParent?: IRecordId[];
};

export async function clipTextSearchFallback() {
  try {
    const clips = await flux.selectMany(Resource.node, {
      filters: {
        contentType: [
          NodeType.WEB_TEXT_BOOKMARK,
          NodeType.TWEET,
          NodeType.KINDLE_HIGHLIGHT,
          NodeType.NODULAR_MARKDOWN,
          ...headingNodeTypes
        ],
        text: false
      }
    });
    logger.info({ at: "clipTextSearchFallback", clips });
    if (clips && isValidArrayWithData(clips)) {
      const promises = clips.map(async (clip: any) => {
        if (clip.text) return;
        const text = clip.body?.text ?? clip.body?.content ?? clip.mdText;
        if (!text) return;
        clip.text = text;
        return flux.mutation(
          Resource.node,
          {
            action: PersistenceActionType.MERGE,
            record: clip
          },
          {
            isPreventSubscriptions: true
          }
        );
      });

      await Promise.all(promises);
    }
    const twitterProfiles = await flux.selectMany(Resource.node, {
      filters: {
        contentType: NodeType.TWITTER_PROFILE,
        label: false
      }
    });
    logger.info({ at: "twitterProfiles", twitterProfiles });
    if (twitterProfiles && isValidArrayWithData(twitterProfiles)) {
      const promises = twitterProfiles.map(async (profile: any) => {
        profile.label = profile.body.name;
        return flux.mutation(
          Resource.node,
          {
            action: PersistenceActionType.MERGE,
            record: profile
          },
          {
            isPreventSubscriptions: true
          }
        );
      });
      await Promise.all(promises);
    }
  } catch (error) {
    logger.error({ at: "clipTextSearchFallback", error });
  }
}

/**
 * Changes made durign v0.58.0 - generating low-res thumbnails for images and files
 */
export async function lowResThumbnailsBackPropagation() {
  logger.log({ at: "lowResThumbnailsBackPropagation" });
  const imagesWithoutLowRes = await flux.selectMany(Resource.file, {
    filters: {
      thumbnailUrl: false,
      thumbnailData: false
    },
    search: {
      query: "image",
      properties: ["type"]
    },
    limit: 10
  });
  logger.info({
    at: "lowResThumbnailsBackPropagation",
    count: imagesWithoutLowRes?.length
  });
  if (imagesWithoutLowRes && isValidArrayWithData(imagesWithoutLowRes)) {
    //TODO
    for (const image of imagesWithoutLowRes) {
      const imageBlob = await fetch(image.url).then((res) => res.blob());

      // const thumbnailBlob = await compressImageToTargetSize(imageBlob);
      // const thumbnailUrl = await account.uploadFileV2(
      //   image.type,
      //   "thumbnail_" + image.label,
      //   thumbnailBlob,
      //   {
      //     isReturnUrl: true
      //   }
      // );
    }
  }
}

export async function collectionResourceBackPropagation() {
  const collections = (await flux.selectMany(Resource.collection, {
    filters: {
      resource: false
    }
  })) as ICollection[] | undefined;
  if (collections && isValidArrayWithData(collections)) {
    await flux.mutation<ICollection>(Resource.collection, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: collections.map((collection: ICollection) => collection.id),
      changes: {
        resource: Resource.node
      }
    });
    logger.info({
      at: "collectionResourceBackPropagation - completed ",
      count: collections.length
    });
  }
}

/**
 * Changes made during v0.59.x - adding mdParent to heading nodes for faster parent hierarchy lookup during searches, thumbnails, etc
 */
export async function headingNodeParentBackPropagation() {
  try {
    const nodes = (await flux.selectMany(Resource.node, {
      filters: {
        contentType: [...headingNodeTypes, NodeType.NODULAR_MARKDOWN]
      }
    })) as IMemotronNode[] | undefined;
    if (!nodes || !isValidArrayWithData(nodes)) return;
    const headingNodesWithoutParent = nodes.filter(
      (node: INode) =>
        node.contentType !== NodeType.NODULAR_MARKDOWN && !node.mdParent
    );
    logger.info({
      at: "headingNodeParentBackPropagation",
      headingNodesWithoutParent
    });
    if (!headingNodesWithoutParent || !headingNodesWithoutParent.length) return;
    let modifiedNodes: { id: IRecordId; mdParent: IRecordId[] }[] = [];
    let orphanNodes: IRecordId[] = [];
    let sortedHeadingNodes: INode[] = [];
    [
      NodeType.HEADING1,
      NodeType.HEADING2,
      NodeType.HEADING3,
      NodeType.HEADING4,
      NodeType.HEADING5
    ].forEach((x: NodeType) => {
      const current = headingNodesWithoutParent.filter(
        (y: INode) => y.contentType === x
      );
      sortedHeadingNodes.push(...current);
    });
    sortedHeadingNodes.forEach((x: INode) => {
      const parent = nodes.find((y: INode) =>
        y.children?.some(resourceInList(x))
      );
      if (parent) {
        const hierarchy = modifiedNodes.find(resourceInList(parent));
        modifiedNodes.push({
          id: x.id,
          mdParent: [...(hierarchy?.mdParent ?? []), parent.id]
        });
      } else {
        orphanNodes.push(x.id);
      }
    });
    logger.info({
      at: "headingNodeParentBackPropagation",
      orphanNodes: orphanNodes.length,
      modifiedNodes: modifiedNodes.length
    });
    if (orphanNodes.length > 0) {
      await flux.mutation<IMemotronNode>(Resource.node, {
        action: PersistenceActionType.BULK_MERGE,
        recordIds: orphanNodes,
        changes: {
          mdParent: []
        }
      });
    }
    if (!modifiedNodes || !modifiedNodes.length) return;
    const promises = modifiedNodes.map((x: { id: IRecordId; mdParent: IRecordId[] }) => {
      return flux.mutation<IMemotronNode>(Resource.node, {
        action: PersistenceActionType.MERGE,
        record: x
      });
    });
    await Promise.all(promises);
  } catch (error) {
    logger.error({ at: "headingNodeParentBackPropagation", error });
  }
}

/**
 * Changes made during v0.59.x - adding collections list to records - for faster collections lookup during searches, thumbnails, etc - for avatar, settings
 */
export async function collectionsListOnRecords() {
  const nodes = (await flux.selectMany(Resource.node, {
    properties: { select: ["id", "avatar"] }
  })) as IMemotronNode[] | undefined;
  if (!nodes?.length) return;
  console.log({ at: "collectionsListOnRecords", nodes });
  const nodesWithAvatars = nodes.filter((x: IMemotronNode) => x.avatar);
  console.log({ at: "collectionsListOnRecords", nodesWithAvatars });

  await flux.mutation<IMemotronNode>(Resource.node, {
    action: PersistenceActionType.BULK_MERGE,
    recordIds: nodesWithAvatars.map((x: IMemotronNode) => x.id),
    changes: {
      avatar: undefined
    }
  });

  const collections = (await flux.selectMany(Resource.collection, {
    properties: { select: ["id"] }
  })) as ICollection[] | undefined;
  if (!collections?.length) return;

  const records = (await flux.selectMany(Resource.link, {
    properties: { expand: ["in"] },
    filters: {
      out: collections.map((collection: ICollection) => collection.id.toString())
    }
  })) as ILinkThumb[] | undefined;
  console.log({ at: "collectionsListOnRecords", collections, records });
  if (records && isValidArrayWithData(records)) {
    const filteredRecords = records.filter((x: ILinkThumb) => {
      return determineResourceType(x.in?.id) === Resource.node;
    });
    const uniqueNodes = filteredRecords
      .map((x: ILinkThumb) => x.in as IMemotronNode)
      .filter(removeDuplicatesFilter)
      .filter((y: IMemotronNode) => !y.collections);
    console.log({ at: "collectionsListOnRecords", uniqueNodes });
    if (!uniqueNodes || !uniqueNodes.length) return;
    const promises: Promise<any>[] = [];
    uniqueNodes.forEach((x: IMemotronNode) => {
      const collections = filteredRecords
        .filter((y: ILinkThumb) => isSameResource(y.in, x))
        .map((y: ILinkThumb) => y.out.id);
      console.log({ at: "collectionsListOnRecords", x, collections });
      promises.push(
        flux.mutation<IMemotronNode>(Resource.node, {
          action: PersistenceActionType.MERGE,
          record: {
            id: x.id,
            collections: collections
          }
        })
      );
    });
    await Promise.all(promises);
  }
}

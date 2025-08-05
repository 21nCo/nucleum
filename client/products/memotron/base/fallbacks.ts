import type { ICollection } from "$lib/client/components/collection/collection.type";
import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  determineResourceType,
  isSameResource,
  removeDuplicatesFilter,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import {
  PersistenceActionType,
  type IRecordId
} from "$lib/client/types/data.type";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { headingNodeTypes, NodeType, type INode } from "../node/node.type";

export async function clipTextSearchFallback() {
  try {
    const clips = await flux.selectMany(Resource.node, {
      filters: {
        contentType: [
          NodeType.TEXT_CLIP,
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
  const collections = await flux.selectMany(Resource.collection, {
    filters: {
      resource: false
    }
  });
  if (collections && isValidArrayWithData(collections)) {
    await flux.mutation(Resource.collection, {
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
    const nodes = await flux.selectMany(Resource.node, {
      filters: {
        contentType: [...headingNodeTypes, NodeType.NODULAR_MARKDOWN]
      }
    });
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
      await flux.mutation(Resource.node, {
        action: PersistenceActionType.BULK_MERGE,
        recordIds: orphanNodes,
        changes: {
          mdParent: []
        }
      });
    }
    if (!modifiedNodes || !modifiedNodes.length) return;
    const promises = modifiedNodes.map((x: any) => {
      return flux.mutation(Resource.node, {
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
  const nodes = await flux.selectMany(Resource.node, {
    properties: { select: ["id", "avatar"] }
  });
  console.log({ at: "collectionsListOnRecords", nodes });
  const nodesWithAvatars = nodes.filter((x) => x.avatar);
  console.log({ at: "collectionsListOnRecords", nodesWithAvatars });

  await flux.mutation(Resource.node, {
    action: PersistenceActionType.BULK_MERGE,
    recordIds: nodesWithAvatars.map((x: INode) => x.id),
    changes: {
      avatar: undefined
    }
  });

  const collections = await flux.selectMany(Resource.collection, {
    properties: { select: ["id"] }
  });

  const records = await flux.selectMany(Resource.link, {
    properties: { expand: ["in"] },
    filters: {
      out: collections.map((x) => x.id.toString())
    }
  });
  console.log({ at: "collectionsListOnRecords", collections, records });
  if (records && isValidArrayWithData(records)) {
    const filteredRecords = records.filter((x) => {
      return determineResourceType(x.in?.id) === Resource.node;
    });
    const uniqueNodes = filteredRecords
      .map((x) => x.in)
      .filter(removeDuplicatesFilter)
      .filter((y) => !y.collections);
    console.log({ at: "collectionsListOnRecords", uniqueNodes });
    if (!uniqueNodes || !uniqueNodes.length) return;
    let promises: Promise<any>[] = [];
    uniqueNodes.forEach((x) => {
      const collections = filteredRecords
        ?.filter((y) => isSameResource(y.in, x))
        ?.map((y) => y.out);
      console.log({ at: "collectionsListOnRecords", x, collections });
      promises.push(
        flux.mutation(Resource.node, {
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

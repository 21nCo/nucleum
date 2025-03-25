import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import account from "$lib/client/stores/account.store";
import { PersistenceActionType } from "$lib/client/types/data.type";
import { compressImageToTargetSize } from "$lib/client/utils/ui.utils";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { headingNodeTypes, NodeType } from "../node/node.type";

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
      records: collections.map((collection) => ({
        id: collection.id,
        resource: Resource.node,
        modifiedAt: new Date().toISOString()
      }))
    });
    logger.info({
      at: "collectionResourceBackPropagation - completed ",
      count: collections.length
    });
  }
}

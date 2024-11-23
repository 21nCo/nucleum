import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "$lib/client/types/data.type";
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
    logger.debug({ at: "clipTextSearchFallback", clips });
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
    logger.log({ at: "twitterProfiles", twitterProfiles });
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

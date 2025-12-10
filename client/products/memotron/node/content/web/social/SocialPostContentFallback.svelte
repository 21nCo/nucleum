<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { getContext, onMount } from "svelte";
  import { resolveContentPreview } from "@21n/products/memotron/node/node.utils";
  import {
    NodeType,
    socialPostNodeTypeList,
    socialProfileWithImageUnavailable
  } from "@21n/products/memotron/node/node.type";
  import type { INode } from "@21n/products/memotron/node/node.type";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Persistence } from "@21n/persistence/persistence";
  import { InfoTextType } from "@21n/types/text.type";
  import { parse } from "@21n/shared-utils/json.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { toasts } from "@21n/stores/notification.store";
  import { Context } from "@21n/types/appStore.type";

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;

  const nodeContext = getContext<any>(Context.NODE);
  let parent: any;
  let parentUsername: string = "";
  let oembedHtml: string | null = null;
  let platformName: string = "";
  let platformDisplay: string = "";

  const contentPreview = resolveContentPreview(node);

  $: {
    if (socialPostNodeTypeList.has(node.contentType)) {
      setPlatformInfo(node.contentType);
    }
  }

  onMount(async () => {
    resolveParentUsername();
    await resolveParent();
  });

  function setPlatformInfo(contentType: NodeType) {
    const platformMap: Record<NodeType, { name: string; display: string }> = {
      [NodeType.TWEET]: { name: "twitter", display: "X" },
      [NodeType.MASTODON_POST]: { name: "mastodon", display: "Mastodon" },
      [NodeType.BLUESKY_POST]: { name: "bluesky", display: "Bluesky" },
      [NodeType.THREADS_POST]: { name: "threads", display: "Threads" },
      [NodeType.LINKEDIN_POST]: { name: "linkedin", display: "LinkedIn" },
      [NodeType.INSTAGRAM_POST]: { name: "instagram", display: "Instagram" },
      [NodeType.INSTAGRAM_REEL]: { name: "instagram", display: "Instagram" },
      [NodeType.FACEBOOK_POST]: { name: "facebook", display: "Facebook" },
      [NodeType.REDDIT_POST]: { name: "reddit", display: "Reddit" }
    };

    const platform = platformMap[contentType];
    if (platform) {
      platformName = platform.name;
      platformDisplay = platform.display;
    }
  }

  function resolveParentUsername() {
    const prefixes = [
      "twitterProfile_",
      "mastodonProfile_",
      "blueskyProfile_",
      "threadsProfile_",
      "linkedinProfile_",
      "instagramProfile_",
      "facebookProfile_",
      "redditProfile_"
    ];

    for (const prefix of prefixes) {
      const username = node.parent?.toString().split(prefix)[1];
      if (username) {
        parentUsername = username;
        return;
      }
    }

    const urlPatterns = [
      { domain: "x.com", split: "x.com/" },
      { domain: "twitter.com", split: "twitter.com/" },
      { domain: "bsky.app", split: "bsky.app/profile/" },
      { domain: "threads.net", split: "threads.net/@" },
      { domain: "linkedin.com", split: "linkedin.com/in/" },
      { domain: "instagram.com", split: "instagram.com/" },
      { domain: "facebook.com", split: "facebook.com/" },
      { domain: "reddit.com", split: "reddit.com/u/" }
    ];

    for (const pattern of urlPatterns) {
      if (node.parent?.url?.includes(pattern.domain)) {
        const username = node.parent.url.split(pattern.split)[1];
        if (username) {
          parentUsername = username.split("/")[0];
          return;
        }
      }
    }

    if (node.parent?.url && node.contentType === NodeType.MASTODON_POST) {
      const mastodonMatch = node.parent.url.match(/\/@([^/]+)/);
      if (mastodonMatch) {
        parentUsername = mastodonMatch[1];
        return;
      }
    }

    if (node.metadata?.username) {
      parentUsername = node.metadata.username;
    }
  }

  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }

  async function resolveOembedHtml() {
    if (node.contentType !== NodeType.TWEET) return;

    const oEmbedUrl = `https://publish.twitter.com/oembed?url=${node.url}`;
    const urlData = await new Persistence().retrieveUrlData(oEmbedUrl, {
      isReturnRawData: true
    });
    const parsed = parse(urlData.text);
    oembedHtml = parsed.html;
  }

  function getPostedAtTime() {
    if ("postedAt" in node.body && node.body.postedAt) {
      return formatDatetime($userPreferences, node.body.postedAt);
    }
    return "Unknown";
  }

  async function copyTextContent() {
    if (contentPreview) {
      await navigator.clipboard.writeText(contentPreview);
      toasts.success("Text copied to clipboard");
    }
  }
</script>

<div
  class="w-full h-full mo:p-4 flex flex-col gap-6 justify-center items-center"
>
  <button
    class="flex flex-col gap-5 p-4 hover:bg-bgs2 border border-fgs4 rounded-md mo:w-full w-3/4"
    on:click|stopPropagation={() => {
      appStore.openLink(node.url);
    }}
  >
    {#if parent}
      <div class="flex gap-2">
        <div>
          {#if !socialProfileWithImageUnavailable.has(node.contentType)}
            <img
              class="w-10 h-10 rounded-full"
              src={parent.body?.profileImageUrl}
              alt="Profile"
            />
          {/if}
        </div>
        <div class="flex flex-col items-start">
          <div class="text-b2">
            {parent.label ?? parent.body?.name ?? parent.body?.displayName}
          </div>
          <div class="text-b4 text-fgs3">
            @{parentUsername}
          </div>
        </div>
      </div>
    {/if}
    <div class="text-left overflow-y-auto max-h-80">
      {contentPreview}
    </div>
    <div class="text-b3 text-fgs3 text-right">
      Posted on {platformDisplay}:
      {getPostedAtTime()}
    </div>
  </button>
  {#if contentPreview}
    <div class="flex justify-center items-center w-full gap-4">
      <Button
        style={ButtonStyle.PLAIN}
        label="Copy text content"
        isUnderlined={true}
        size={Size.sm}
        on:click={(e) => {
          e.stopPropagation();
          copyTextContent();
        }}
      />
    </div>
  {/if}
</div>

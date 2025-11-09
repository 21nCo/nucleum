<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { getContext, onMount } from "svelte";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import type { INode } from "@21n/products/memotron/node/node.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import TweetPreviewUsingWidget from "@21n/products/memotron/node/content/web/social/TweetPreviewUsingWidget.svelte";
  import InstagramPostWidget from "@21n/products/memotron/node/content/web/social/InstagramPostWidget.svelte";
  import LinkedInPostWidget from "@21n/products/memotron/node/content/web/social/LinkedInPostWidget.svelte";
  import RedditPostWidget from "@21n/products/memotron/node/content/web/social/RedditPostWidget.svelte";
  import FacebookPostWidget from "@21n/products/memotron/node/content/web/social/FacebookPostWidget.svelte";
  import MastodonPostWidget from "@21n/products/memotron/node/content/web/social/MastodonPostWidget.svelte";
  import BlueskyPostWidget from "@21n/products/memotron/node/content/web/social/BlueskyPostWidget.svelte";
  import ThreadsPostWidget from "@21n/products/memotron/node/content/web/social/ThreadsPostWidget.svelte";
  import account from "@21n/stores/account.store";
  import SocialPostContentFallback from "@21n/products/memotron/node/content/web/social/SocialPostContentFallback.svelte";
  import context from "@21n/stores/context.store";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, type IButtonParams } from "@21n/types/button.type";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { resolveContentPreview } from "@21n/products/memotron/node/node.utils";
  import { toasts } from "@21n/stores/notification.store";
  import ButtonGroup from "@21n/elements/button/ButtonGroup.svelte";

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;

  const nodeContext = getContext<any>("node");
  let oembedHtml: string | null = null;
  let error: string = "";
  let hasPermanentCopy = false;
  let isShowPermanentCopy: boolean = false;
  onMount(async () => {
    await resolveParent();
  });

  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }

  $: hasPermanentCopy = !!resolveContentPreview(node);

  function shouldShowWidget() {
    if (!account.isCloudUserAndOnline()) return false;

    const supportedWidgets = [
      NodeType.TWEET,
      NodeType.INSTAGRAM_POST,
      NodeType.INSTAGRAM_REEL,
      NodeType.LINKEDIN_POST,
      NodeType.REDDIT_POST,
      NodeType.MASTODON_POST,
      NodeType.BLUESKY_POST,
      NodeType.THREADS_POST
    ];

    const supportedWidgetsOnEmbed = [
      NodeType.TWEET,
      NodeType.INSTAGRAM_POST,
      NodeType.INSTAGRAM_REEL,
      NodeType.MASTODON_POST,
      NodeType.BLUESKY_POST,
      NodeType.THREADS_POST
    ];

    if ($context.isEmbed) {
      return supportedWidgetsOnEmbed.includes(node.contentType);
    } else {
      return supportedWidgets.includes(node.contentType);
    }
  }

  function onError(event: CustomEvent) {
    error = event.detail;
  }
  function resolveOpenInButtonLabel() {
    let suffix = "";
    if (node.contentType === NodeType.TWEET) suffix = "Twitter";
    else if (
      node.contentType === NodeType.INSTAGRAM_POST ||
      node.contentType === NodeType.INSTAGRAM_REEL
    )
      suffix = "Instagram";
    else suffix = properCase(node.contentType.split("_POST")[0]);
    return `Open on ${suffix}`;
  }

  async function copyTextContent() {
    const text = resolveContentPreview(node);
    if (text) {
      await navigator.clipboard.writeText(text);
      toasts.success("Text copied to clipboard");
    }
  }

  $: buttons = [
    ...(hasPermanentCopy
      ? [
          {
            label: "Copy text content",
            size: Size.sm,
            callback: async (e: MouseEvent) => {
              e.stopPropagation();
              await copyTextContent();
            }
          } as IButtonParams,
          {
            label: isShowPermanentCopy ? "View as embed" : "View copy",
            size: Size.sm,
            callback: async (e: MouseEvent) => {
              e.stopPropagation();
              isShowPermanentCopy = !isShowPermanentCopy;
            }
          } as IButtonParams
        ]
      : []),
    {
      label: resolveOpenInButtonLabel(),
      size: Size.sm,
      callback: async () => {
        if (!node.url) return;
        appStore.openLink(node.url);
      }
    } as IButtonParams
  ];
</script>

{#if oembedHtml}
  {@html oembedHtml}
{:else if shouldShowWidget() && node.url && !error && !isShowPermanentCopy}
  <div
    class="relative w-full h-full flex flex-col justify-center items-center overflow-y-auto cw:mb-10"
  >
    <div class="absolute inset-0 flex justify-center items-center z-0 mb-12">
      <Icon icon="svg-spinners:3-dots-fade" size={Size.lg} />
    </div>
    <div
      class="relative w-9/10 flex-grow flex flex-col items-center max-w-2xl px-4 py-6 z-10"
    >
      {#if $context.isEmbed}
        <button class="absolute inset-0 z-20" on:click></button>
      {/if}
      {#if node.contentType === NodeType.TWEET}
        <TweetPreviewUsingWidget tweetUrl={node.url} />
      {:else if node.contentType === NodeType.INSTAGRAM_POST || node.contentType === NodeType.INSTAGRAM_REEL}
        <InstagramPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.LINKEDIN_POST}
        <LinkedInPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.REDDIT_POST}
        <RedditPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.FACEBOOK_POST}
        <FacebookPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {:else if node.contentType === NodeType.MASTODON_POST}
        <MastodonPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {:else if node.contentType === NodeType.BLUESKY_POST}
        <BlueskyPostWidget postUrl={node.url} on:error={onError} />
      {:else if node.contentType === NodeType.THREADS_POST}
        <ThreadsPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {/if}
    </div>
    <ButtonGroup {buttons} isFooter={true} />
  </div>
{:else}
  <SocialPostContentFallback {node} />
  <ButtonGroup {buttons} isFooter={true} />
{/if}

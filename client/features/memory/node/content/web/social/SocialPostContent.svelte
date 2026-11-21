<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
  import type { INode } from "@nucleum/features/memory/node/node.type";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import TweetPreviewUsingWidget from "@nucleum/features/memory/node/content/web/social/TweetPreviewUsingWidget.svelte";
  import InstagramPostWidget from "@nucleum/features/memory/node/content/web/social/InstagramPostWidget.svelte";
  import LinkedInPostWidget from "@nucleum/features/memory/node/content/web/social/LinkedInPostWidget.svelte";
  import RedditPostWidget from "@nucleum/features/memory/node/content/web/social/RedditPostWidget.svelte";
  import FacebookPostWidget from "@nucleum/features/memory/node/content/web/social/FacebookPostWidget.svelte";
  import BlueskyPostWidget from "@nucleum/features/memory/node/content/web/social/BlueskyPostWidget.svelte";
  import ThreadsPostWidget from "@nucleum/features/memory/node/content/web/social/ThreadsPostWidget.svelte";
  import { hasLiveSocialWidget } from "@nucleum/features/memory/node/content/web/social/social-widgets";
  import account from "@nucleum/client/runtime/account/account.store";
  import { isCloudUserAndOnline } from "@nucleum/client/runtime/account/account.utils";
  import SocialPostContentFallback from "@nucleum/features/memory/node/content/web/social/SocialPostContentFallback.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { Context } from "@nucleum/shared-state/app-context/app-store.type";

  let {
    node,
    accessPoint = ResourceAccessPoint.SELF
  }: {
    node: INode;
    accessPoint?: ResourceAccessPoint;
  } = $props();
  void accessPoint;

  const nodeContext = getContext<any>(Context.NODE);
  let oembedHtml: string | null = null;
  let error = $state("");
  let isShowPermanentCopy = $state(false);
  onMount(async () => {
    await resolveParent();
  });

  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }

  function shouldShowWidget() {
    if (!isCloudUserAndOnline($account, $context.isInOfflineMode)) return false;

    return hasLiveSocialWidget(node.contentType, $context.isEmbed);
  }

  /** URL of the live widget that can render for this post right now; gates both the widget and the embed toggle. */
  const widgetUrl = $derived(
    shouldShowWidget() && node.url && !error ? node.url : undefined
  );

  function onError(message: string) {
    error = message;
  }
</script>

{#if oembedHtml}
  {@html oembedHtml}
{:else if widgetUrl && !isShowPermanentCopy}
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
        <button
          class="absolute inset-0 z-20"
          aria-label="Keep embed interaction inside the preview"
          onclick={(event) => event.stopPropagation()}
        ></button>
      {/if}
      {#if node.contentType === NodeType.TWEET}
        <TweetPreviewUsingWidget tweetUrl={widgetUrl} />
      {:else if node.contentType === NodeType.INSTAGRAM_POST || node.contentType === NodeType.INSTAGRAM_REEL}
        <InstagramPostWidget postUrl={widgetUrl} />
      {:else if node.contentType === NodeType.LINKEDIN_POST}
        <LinkedInPostWidget postUrl={widgetUrl} />
      {:else if node.contentType === NodeType.REDDIT_POST}
        <RedditPostWidget postUrl={widgetUrl} />
      {:else if node.contentType === NodeType.FACEBOOK_POST}
        <FacebookPostWidget postUrl={widgetUrl} {onError} onFallback={onError} />
      {:else if node.contentType === NodeType.BLUESKY_POST}
        <BlueskyPostWidget postUrl={widgetUrl} {onError} />
      {:else if node.contentType === NodeType.THREADS_POST}
        <ThreadsPostWidget postUrl={widgetUrl} {onError} onFallback={onError} />
      {/if}
    </div>
  </div>
{:else}
  <SocialPostContentFallback
    {node}
    onViewEmbed={widgetUrl
      ? () => {
          isShowPermanentCopy = !isShowPermanentCopy;
        }
      : undefined}
  />
{/if}
